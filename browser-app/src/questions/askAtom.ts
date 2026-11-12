import { Effect, Stream } from "effect"

import { QuestionRequest } from "@policyhuis/protocol/QuestionsApi"

import { ApiClient } from "../api/ApiClient.ts"
import { apiRuntime } from "../api/runtime.ts"
import { initialState, reduce } from "./QuestionState.ts"

/** A question to ask, and the model configuration to answer it; null leaves the choice to the backend's default. */
export interface Ask {
  readonly question: string
  readonly model: string | null
}

/**
 * The current question's state, as a stream of states folded from the backend's events. Writing a question starts a
 * new answer and interrupts the one before it; writing `Atom.Interrupt` stops it.
 */
export const askAtom = apiRuntime.fn(({ question, model }: Ask) =>
  Stream.unwrap(
    Effect.gen(function* () {
      const client = yield* ApiClient
      const payload = QuestionRequest.make(model === null ? { question } : { question, model })
      return yield* client.questions.ask({ payload })
    })
  ).pipe(Stream.scan(() => initialState, reduce))
)
