import { describe, expect, it } from "@effect/vitest"

import {
  CALL_A,
  CALL_B,
  complete,
  datasetCitation,
  events,
  QUERY_1,
  text,
  toolFailure,
  toolStart,
  toolSuccess
} from "./fixtures.ts"
import { initialState, reduce } from "./QuestionState.ts"

const fold = (encoded: ReadonlyArray<unknown>) => events(encoded).reduce(reduce, initialState)

describe("reduce", () => {
  it("tracks tool calls by ID, whatever order they finish in", () => {
    const state = fold([
      toolStart(CALL_A),
      toolStart(CALL_B, "sf_dataset_info"),
      toolFailure(CALL_B, "UnknownValue", "sf_dataset_info"),
      toolSuccess(CALL_A, { groups: [], citations: [] })
    ])
    expect(state.toolCalls.map((call) => [call.tool, call.status, call.error])).toEqual([
      ["sf_development_pipeline_summary", "done", null],
      ["sf_dataset_info", "failed", "UnknownValue"]
    ])
  })

  it("appends text that arrives after the tool calls, in one chunk or several", () => {
    expect(fold([toolStart(CALL_A), toolSuccess(CALL_A, {}), text("All of it.")]).answer).toBe("All of it.")
    expect(fold([text("One, "), text("two.")]).answer).toBe("One, two.")
  })

  it("collects the citations of successful results, by citation ID", () => {
    const citation = datasetCitation(QUERY_1)
    const state = fold([toolStart(CALL_A), toolSuccess(CALL_A, { groups: [], citations: [citation] })])
    expect([...state.citations.keys()]).toEqual([citation.citationId])
  })

  it("ignores a result whose citations do not decode", () => {
    const state = fold([toolStart(CALL_A), toolSuccess(CALL_A, { citations: [{ citationId: "not a citation" }] })])
    expect(state.citations.size).toBe(0)
    expect(state.toolCalls[0]?.status).toBe("done")
  })

  it("marks calls still running at Complete as unfinished", () => {
    const state = fold([toolStart(CALL_A), complete("failed", "The model stopped partway through.")])
    expect(state.toolCalls[0]?.status).toBe("unfinished")
    expect(state.complete?.outcome).toBe("failed")
  })

  it("keeps every Complete outcome and the servers that could not be reached", () => {
    for (const outcome of ["answered", "step_limit", "context_limit", "truncated", "failed"]) {
      expect(fold([complete(outcome)]).complete?.outcome).toBe(outcome)
    }
    expect(fold([complete("answered", null, ["sf-housing"])]).complete?.unavailableServers).toEqual(["sf-housing"])
  })

  it("ignores keepalives", () => {
    expect(fold([{ _tag: "Keepalive" }])).toEqual(initialState)
  })
})
