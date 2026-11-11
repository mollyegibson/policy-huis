import { describe, expect, it } from "@effect/vitest"

import {
  CALL_A,
  CALL_B,
  complete,
  datasetCitation,
  events,
  lookupFailed,
  lookupStarted,
  lookupSucceeded,
  QUERY_1,
  QUERY_2,
  sources,
  text
} from "./fixtures.ts"
import { initialState, reduce } from "./QuestionState.ts"

const fold = (encoded: ReadonlyArray<unknown>) => events(encoded).reduce(reduce, initialState)

describe("reduce", () => {
  it("tracks lookups by ID, whatever order they finish in", () => {
    const state = fold([
      lookupStarted(CALL_A),
      lookupStarted(CALL_B, "sf_data_dataset_info", { name: "sf-data", label: "SF Data" }, "Dataset details"),
      lookupFailed(CALL_B, "UnknownValue"),
      lookupSucceeded(CALL_A, { groups: [], citations: [] })
    ])
    expect(state.lookups.map((l) => [l.title, l.source?.label, l.status, l.error])).toEqual([
      ["Planning pipeline totals", "SF Data", "succeeded", null],
      ["Dataset details", "SF Data", "failed", "UnknownValue"]
    ])
  })

  it("marks a lookup whose server could not be reached as unavailable", () => {
    const state = fold([lookupStarted(CALL_A), lookupFailed(CALL_A, "DatabaseUnavailable", "unavailable")])
    expect([state.lookups[0]?.status, state.lookups[0]?.error]).toEqual(["unavailable", "DatabaseUnavailable"])
  })

  it("appends text that arrives after the lookups, in one chunk or several", () => {
    expect(fold([lookupStarted(CALL_A), lookupSucceeded(CALL_A, {}), text("All of it.")]).answer).toBe("All of it.")
    expect(fold([text("One, "), text("two.")]).answer).toBe("One, two.")
  })

  it("collects citations from Sources, by citation ID", () => {
    const first = datasetCitation(QUERY_1)
    const second = datasetCitation(QUERY_2)
    const state = fold([
      lookupStarted(CALL_A),
      lookupSucceeded(CALL_A, {}),
      sources(CALL_A, [first]),
      sources(CALL_B, [second])
    ])
    expect([...state.citations.keys()]).toEqual([first.citationId, second.citationId])
  })

  it("never reads citations from a result, which is only shown", () => {
    const state = fold([lookupStarted(CALL_A), lookupSucceeded(CALL_A, { citations: [datasetCitation(QUERY_1)] })])
    expect(state.citations.size).toBe(0)
    expect(state.lookups[0]?.result).toEqual({ citations: [datasetCitation(QUERY_1)] })
  })

  it("marks lookups still running at Complete as unfinished", () => {
    const state = fold([lookupStarted(CALL_A), complete("failed", "The model stopped partway through.")])
    expect(state.lookups[0]?.status).toBe("unfinished")
    expect(state.complete?.outcome).toBe("failed")
  })

  it("keeps every Complete outcome and the servers that could not be reached", () => {
    for (const outcome of ["answered", "step_limit", "context_limit", "truncated", "failed"]) {
      expect(fold([complete(outcome)]).complete?.outcome).toBe(outcome)
    }
    expect(fold([complete("answered", null, ["sf-data"])]).complete?.unavailableServers).toEqual(["sf-data"])
  })

  it("ignores keepalives", () => {
    expect(fold([{ _tag: "Keepalive" }])).toEqual(initialState)
  })
})
