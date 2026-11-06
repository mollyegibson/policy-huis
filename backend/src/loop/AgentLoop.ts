import { Cause, Clock, Duration, Effect, Ref, Stream } from "effect"
import { LanguageModel, Prompt } from "effect/ai"
import type { Response, Tool, Toolkit } from "effect/ai"

import { TextChunk, ToolEnd, ToolStart } from "@policyhuis/protocol/QuestionsApi"

import { estimateNextPromptTokens, fits } from "./ContextBudget.ts"
import { Failure, LoopFailure, modelFailure, retryClass } from "./Failures.ts"
import type { LoopEvent, Outcome } from "./LoopEvent.ts"
import { Finished, isBrowserEvent, ModelRetried, StepEnded, StepStarted, ToolFailed, ToolTimed } from "./LoopEvent.ts"
import { errorType, structuredContent } from "./ToolResults.ts"

export interface LoopSettings {
  readonly maxSteps: number
  readonly stepTimeout: Duration.Duration
  readonly requestTimeout: Duration.Duration
  readonly modelRetries: number
  readonly modelRetryBaseDelay: Duration.Duration
  readonly toolConcurrency: number
  readonly contextTokens: number
  readonly answerTokens: number
  readonly bytesPerToken: number
}

const STEP_LIMIT_NOTICE =
  "You have reached the limit on data lookups for this question. Answer now from the tool results above, citing them, and say what you could not check."

const CONTEXT_LIMIT_NOTICE =
  "The data looked up is more than you can read at once. Answer now from the tool results above, citing them, and say what you could not check."

const partEvents = Effect.fn("AgentLoop.partEvents")(function* <Tools extends Record<string, Tool.Any>>(
  part: Response.StreamPart<Tools, "opaque">
): Effect.fn.Return<ReadonlyArray<LoopEvent>> {
  switch (part.type) {
    case "text-delta":
      return [TextChunk.make({ text: part.delta })]
    case "tool-call": {
      const at = yield* Clock.currentTimeMillis
      const args: unknown = part.params
      return [
        ToolStart.make({ callId: part.id, tool: part.name, arguments: args }),
        new ToolTimed({ callId: part.id, at })
      ]
    }
    case "tool-result": {
      if (part.preliminary) return []
      const at = yield* Clock.currentTimeMillis
      const timed = new ToolTimed({ callId: part.id, at })
      if (!part.isFailure) {
        const result = structuredContent(part.result)
        return [ToolEnd.make({ callId: part.id, tool: part.name, outcome: "success", result, error: null }), timed]
      }
      const encodedError: unknown = part.encodedResult
      return [
        ToolEnd.make({
          callId: part.id,
          tool: part.name,
          outcome: "failure",
          result: null,
          error: errorType(part.result)
        }),
        new ToolFailed({ callId: part.id, encodedError }),
        timed
      ]
    }
    default:
      return []
  }
})

const stepEnded = (parts: ReadonlyArray<Response.AnyPart>): StepEnded => {
  const finish = parts.find((part): part is Response.FinishPart => part.type === "finish")
  return new StepEnded({
    parts,
    finishReason: finish?.reason ?? "unknown",
    inputTokens: finish?.usage.inputTokens.total,
    outputTokens: finish?.usage.outputTokens.total
  })
}

/** Fails the stream with `failure` once `duration` has passed. */
const failAfter = (duration: Duration.Duration, failure: Failure) =>
  Effect.sleep(duration).pipe(Effect.andThen(Effect.fail(new LoopFailure({ failure }))))

/**
 * Answers one question: model turns with tools until the model answers or a limit is reached, as a stream of
 * `LoopEvent`s that always ends with `Finished` unless it is interrupted. The stream itself never fails.
 */
export const runAgentLoop = <Tools extends Record<string, Tool.Any>>(
  initialPrompt: Prompt.Prompt,
  toolkit: Toolkit.WithHandler<Tools>,
  settings: LoopSettings
) =>
  Stream.unwrap(
    Effect.gen(function* () {
      const retriesLeft = yield* Ref.make(settings.modelRetries)

      /** One model turn, retried by error class while none of its output has reached the browser. */
      const turn = (
        prompt: Prompt.Prompt,
        final: boolean
      ): Stream.Stream<
        LoopEvent,
        LoopFailure,
        LanguageModel.LanguageModel | Tool.HandlerServices<Tools[keyof Tools]>
      > =>
        Stream.suspend(() => {
          const parts: Array<Response.AnyPart> = []
          let reachedBrowser = false
          const model = LanguageModel.streamText({
            prompt,
            toolkit,
            concurrency: settings.toolConcurrency,
            ...(final ? { toolChoice: "none" as const } : {})
          })
          return model.pipe(
            Stream.mapEffect((part) => {
              parts.push(part)
              return partEvents(part)
            }),
            Stream.flatMap((events) => Stream.fromIterable(events)),
            Stream.tap((event) =>
              Effect.sync(() => {
                if (isBrowserEvent(event)) reachedBrowser = true
              })
            ),
            Stream.concat(Stream.suspend(() => Stream.make(stepEnded(parts)))),
            Stream.catchCause((cause) => {
              if (Cause.hasInterruptsOnly(cause)) return Stream.fromEffect(Effect.interrupt)
              const error = Cause.squash(cause)
              const detail = Cause.pretty(cause)
              if (reachedBrowser) return Stream.fail(new LoopFailure({ failure: Failure.ModelStopped({ detail }) }))
              const retry = retryClass(error)
              return Stream.unwrap(
                Effect.gen(function* () {
                  const left = yield* Ref.get(retriesLeft)
                  if (retry._tag === "none" || left === 0) {
                    return Stream.fail(new LoopFailure({ failure: modelFailure(error, detail) }))
                  }
                  yield* Ref.set(retriesLeft, left - 1)
                  if (retry._tag === "transient") {
                    const attempt = settings.modelRetries - left
                    yield* Effect.sleep(Duration.times(settings.modelRetryBaseDelay, 2 ** attempt))
                    return Stream.make(new ModelRetried({ reason: detail })).pipe(Stream.concat(turn(prompt, final)))
                  }
                  return Stream.make(new ModelRetried({ reason: detail })).pipe(
                    Stream.concat(turn(Prompt.concat(prompt, Prompt.make(retry.message)), final))
                  )
                })
              )
            })
          )
        })

      /** A turn bounded by the step timeout, reporting the `StepEnded` it produced. */
      const timedTurn = (prompt: Prompt.Prompt, step: number, final: boolean, onEnded: (ended: StepEnded) => void) =>
        Stream.make(new StepStarted({ step, final })).pipe(
          Stream.concat(
            turn(prompt, final).pipe(
              Stream.tap((event) =>
                Effect.sync(() => {
                  if (event._tag === "StepEnded") onEnded(event)
                })
              ),
              Stream.interruptWhen(failAfter(settings.stepTimeout, Failure.StepTimedOut()))
            )
          )
        )

      const finished = (outcome: Outcome, failure: Failure | null) => Stream.make(new Finished({ outcome, failure }))

      /** The turn without tools that answers from what was gathered when a limit is reached. */
      const finalTurn = (prompt: Prompt.Prompt, notice: string, step: number, outcome: Outcome, failure: Failure) =>
        Stream.suspend(() => {
          let ended: StepEnded | undefined
          return timedTurn(Prompt.concat(prompt, Prompt.make(notice)), step, true, (e) => {
            ended = e
          }).pipe(
            Stream.concat(
              Stream.suspend(() =>
                ended?.finishReason === "length"
                  ? finished("truncated", Failure.Truncated())
                  : finished(outcome, failure)
              )
            )
          )
        })

      const steps = (
        prompt: Prompt.Prompt,
        step: number
      ): Stream.Stream<
        LoopEvent,
        LoopFailure,
        LanguageModel.LanguageModel | Tool.HandlerServices<Tools[keyof Tools]>
      > => {
        if (step >= settings.maxSteps) {
          return finalTurn(prompt, STEP_LIMIT_NOTICE, step, "step_limit", Failure.StepLimit())
        }
        return Stream.suspend(() => {
          let ended: StepEnded | undefined
          return timedTurn(prompt, step, false, (e) => {
            ended = e
          }).pipe(
            Stream.concat(
              Stream.suspend(() => {
                if (ended === undefined) return Stream.die("a model turn ended without its StepEnded event")
                if (ended.finishReason === "length") return finished("truncated", Failure.Truncated())
                if (!ended.parts.some((part) => part.type === "tool-call")) return finished("answered", null)
                const next = Prompt.concat(prompt, Prompt.fromResponseParts(ended.parts))
                return fits(estimateNextPromptTokens(ended, next, settings), settings)
                  ? steps(next, step + 1)
                  : finalTurn(prompt, CONTEXT_LIMIT_NOTICE, step + 1, "context_limit", Failure.ContextLimit())
              })
            )
          )
        })
      }

      return steps(initialPrompt, 0).pipe(
        Stream.interruptWhen(failAfter(settings.requestTimeout, Failure.RequestTimedOut())),
        Stream.catchCause((cause) => {
          if (Cause.hasInterruptsOnly(cause)) return Stream.fromEffect(Effect.interrupt)
          const error = Cause.squash(cause)
          const failure =
            error instanceof LoopFailure ? error.failure : Failure.Internal({ detail: Cause.pretty(cause) })
          return finished("failed", failure)
        })
      )
    })
  )
