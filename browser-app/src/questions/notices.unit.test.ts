import { describe, expect, it } from "@effect/vitest"
import { Cause, Option } from "effect"
import { AsyncResult } from "effect/reactivity"

import { AgentUnavailable } from "@policyhuis/protocol/QuestionsApi"

import { complete, events } from "./fixtures.ts"
import { LOGGED_NOTICE, questionView } from "./notices.ts"
import type { QuestionState } from "./QuestionState.ts"
import { initialState, reduce } from "./QuestionState.ts"

const withAnswer: QuestionState = { ...initialState, answer: "Partial answer" }

const finished = (encoded: unknown) => events([encoded]).reduce(reduce, initialState)

const texts = (result: AsyncResult.AsyncResult<QuestionState, unknown>) =>
  questionView(result).notices.map((notice) => notice.text)

describe("questionView", () => {
  it("shows only the logging note before anything is asked, and for an answered question", () => {
    expect(texts(AsyncResult.initial())).toEqual([LOGGED_NOTICE.text])
    expect(texts(AsyncResult.success(finished(complete("answered"))))).toEqual([LOGGED_NOTICE.text])
  })

  it("shows an incomplete answer's message and each unreachable server", () => {
    const state = finished(complete("step_limit", "This answer is incomplete.", ["sf-data"]))
    expect(texts(AsyncResult.success(state))).toEqual([
      "This answer is incomplete.",
      "The sf-data server could not be reached, so this answer may be missing its data.",
      LOGGED_NOTICE.text
    ])
  })

  it("shows Stop as stopped, keeping the partial answer", () => {
    const stopped = AsyncResult.failureWithPrevious<QuestionState, never>(Cause.interrupt(), {
      previous: Option.some(AsyncResult.success(withAnswer))
    })
    expect(questionView(stopped).state?.answer).toBe("Partial answer")
    expect(texts(stopped)).toEqual(["Stopped.", LOGGED_NOTICE.text])
  })

  it("shows the backend's busy message", () => {
    const busy = AsyncResult.failure<QuestionState, AgentUnavailable>(
      Cause.fail(new AgentUnavailable({ reason: "busy", message: "Another question is being answered." }))
    )
    expect(texts(busy)).toEqual(["Another question is being answered.", LOGGED_NOTICE.text])
  })

  it("shows the offline notice for any other failure, keeping what arrived", () => {
    const broken = AsyncResult.failureWithPrevious<QuestionState, Error>(Cause.fail(new Error("network")), {
      previous: Option.some(AsyncResult.success(withAnswer))
    })
    expect(questionView(broken).state?.answer).toBe("Partial answer")
    expect(texts(broken)[0]).toBe("The agent host could not be reached. It may be offline; try again shortly.")
  })
})
