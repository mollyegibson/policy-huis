import { Context, Effect, Layer, Stream } from "effect"
import type { ManagedRuntime } from "effect"
import { FetchHttpClient } from "effect/http"
import { HttpApiClient } from "effect/http-api"
import type { ApiProvider, ProviderResponse } from "promptfoo"

import { PolicyHuisApi, QuestionRequest } from "@policyhuis/protocol/QuestionsApi"

import { foldAnswer } from "./Answer.ts"
import type { Answer } from "./Answer.ts"
import { BackendConfig } from "./EvaluationConfig.ts"

const makeClient = Effect.gen(function* () {
  const { url } = yield* BackendConfig
  return yield* HttpApiClient.make(PolicyHuisApi, { baseUrl: url })
})

/** The typed client for the backend's API, at `EVALUATION_BACKEND_URL`. */
export class BackendClient extends Context.Service<BackendClient, Effect.Success<typeof makeClient>>()(
  "evaluation/BackendClient"
) {
  static readonly layer = Layer.effect(this, makeClient).pipe(Layer.provide(FetchHttpClient.layer))
}

/**
 * Which of the backend's model configurations answers, the backend's default when `model` is absent, and the
 * evaluation run its traces are marked with.
 */
export interface Target {
  readonly model?: string
  readonly evaluationRunId: string
}

/** Asks the backend one question and collects every event it streams into the question's `Answer`. */
export const ask = Effect.fn("BackendProvider.ask")(function* (question: string, target: Target) {
  const client = yield* BackendClient
  const events = yield* client.questions.ask({ payload: QuestionRequest.make({ question, ...target }) })
  return foldAnswer(yield* Stream.runCollect(events))
})

/**
 * The promptfoo result for an answer. An answer cut short by something other than the model (the stream ended
 * without `Complete`, a server or the model could not be reached) is a promptfoo error, which is left out of the pass
 * rates; every other answer is graded, its `Answer` attached as `metadata.answer` for the checks.
 */
export const toProviderResponse = (answer: Answer): ProviderResponse => {
  const metadata = { answer }
  if (answer.outcome === null) return { error: "The stream ended without Complete", metadata }
  if (answer.unavailableServers.length > 0) {
    return { error: `Unavailable: ${answer.unavailableServers.join(", ")}`, metadata }
  }
  if (answer.outcome === "failed") return { error: `Failed: ${answer.message ?? "no message"}`, metadata }
  const usage = answer.usage
  return {
    output: answer.text,
    metadata,
    ...(usage === null
      ? {}
      : {
          tokenUsage: {
            prompt: usage.inputTokens,
            completion: usage.outputTokens,
            total: usage.inputTokens + usage.outputTokens
          }
        })
  }
}

/**
 * A promptfoo provider that answers with the running backend's `target` model configuration, through `runtime`,
 * which provides its client. `label` names it in promptfoo's results.
 */
export const backendProvider = <E>(
  runtime: ManagedRuntime.ManagedRuntime<BackendClient, E>,
  target: Target,
  label: string
): ApiProvider => ({
  id: () => `policyhuis-backend:${label}`,
  label,
  callApi: (prompt) =>
    runtime.runPromise(
      ask(prompt, target).pipe(
        Effect.match({
          onFailure: (error): ProviderResponse => ({
            error: `The backend could not answer: ${error instanceof Error ? `${error._tag}: ${error.message}` : error._tag}`
          }),
          onSuccess: toProviderResponse
        })
      )
    )
})
