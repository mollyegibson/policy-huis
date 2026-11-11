import { Cause, Option, Result } from "effect"
import type { AsyncResult } from "effect/reactivity"

import { AgentUnavailable } from "@policyhuis/protocol/QuestionsApi"

import type { QuestionState } from "./QuestionState.ts"

export interface Notice {
  readonly severity: "info" | "warning" | "error"
  readonly text: string
}

export const LOGGED_NOTICE: Notice = { severity: "info", text: "Questions you ask are logged." }

const OFFLINE_TEXT = "The agent host could not be reached. It may be offline; try again shortly."

/** What the page shows for an ask result: the latest state, whether it is still streaming, and its notices. */
export interface QuestionView {
  /** The latest state, kept after a failure so a broken or stopped answer still shows what arrived. */
  readonly state: QuestionState | null
  readonly streaming: boolean
  readonly notices: ReadonlyArray<Notice>
}

/** The notices for a finished stream, from its `Complete` event. */
const completeNotices = (state: QuestionState): ReadonlyArray<Notice> => {
  const complete = state.complete
  if (complete === null) return []
  return [
    ...(complete.outcome !== "answered" && complete.message !== null
      ? [{ severity: "warning" as const, text: complete.message }]
      : []),
    ...complete.unavailableServers.map((server) => ({
      severity: "warning" as const,
      text: `The ${server} server could not be reached, so this answer may be missing its data.`
    }))
  ]
}

/** The notice for a stream that failed: stopped by the user, turned away as busy, or cut off from the backend. */
const failureNotice = <E>(cause: Cause.Cause<E>): Notice => {
  if (Cause.hasInterruptsOnly(cause)) return { severity: "info", text: "Stopped." }
  const error = Cause.findError(cause)
  if (Result.isSuccess(error) && error.success instanceof AgentUnavailable) {
    return { severity: "warning", text: error.success.message }
  }
  return { severity: "error", text: OFFLINE_TEXT }
}

export const questionView = <E>(result: AsyncResult.AsyncResult<QuestionState, E>): QuestionView => {
  switch (result._tag) {
    case "Initial":
      return { state: null, streaming: result.waiting, notices: [LOGGED_NOTICE] }
    case "Success":
      return {
        state: result.value,
        streaming: result.waiting,
        notices: [...completeNotices(result.value), LOGGED_NOTICE]
      }
    case "Failure": {
      const state = Option.match(result.previousSuccess, { onNone: () => null, onSome: (success) => success.value })
      return {
        state,
        streaming: result.waiting,
        notices: [...(state === null ? [] : completeNotices(state)), failureNotice(result.cause), LOGGED_NOTICE]
      }
    }
  }
}
