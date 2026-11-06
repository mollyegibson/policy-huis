import { Effect, Stream } from "effect"
import { Atom } from "effect/reactivity"

import { QuestionRequest } from "@policyhuis/protocol/QuestionsApi"

import { ApiClient } from "../api/ApiClient.ts"
import { initialState, reduce } from "./QuestionState.ts"

const runtime = Atom.runtime(ApiClient.layer)

/**
 * The current question's state, as a stream of states folded from the backend's events. Writing a question starts a
 * new answer and interrupts the one before it; writing `Atom.Interrupt` stops it.
 */
export const askAtom = runtime.fn((question: string) =>
  Stream.unwrap(
    Effect.gen(function* () {
      const client = yield* ApiClient
      return yield* client.questions.ask({ payload: QuestionRequest.make({ question }) })
    })
  ).pipe(Stream.scan(() => initialState, reduce))
)
