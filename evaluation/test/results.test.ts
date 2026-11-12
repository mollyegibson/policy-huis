import { describe, expect, it } from "@effect/vitest"

import { summarize } from "../src/results.ts"
import type { ResultRow } from "../src/results.ts"

const row = (id: string, checks: ReadonlyArray<[string, boolean]>, error?: string): ResultRow => ({
  success: error === undefined && checks.every(([, pass]) => pass),
  error: error ?? null,
  failureReason: error === undefined ? (checks.every(([, pass]) => pass) ? 0 : 1) : 2,
  testCase: { vars: { id } },
  provider: { id: "policyhuis-backend:local (gpt-oss:20b)", label: "local (gpt-oss:20b)" },
  gradingResult: { componentResults: checks.map(([metric, pass]) => ({ pass, assertion: { metric } })) }
})

describe("summarize", () => {
  it("tallies each check over graded answers and lists the failed checks of each failing answer", () => {
    const summary = summarize([
      row("sf-bla-01", [
        ["completed", true],
        ["calledExpectedTool", false]
      ]),
      row("sf-bla-02", [
        ["completed", true],
        ["calledExpectedTool", true]
      ])
    ])
    expect(summary.checks).toEqual([
      { check: "completed", passed: 2, graded: 2 },
      { check: "calledExpectedTool", passed: 1, graded: 2 }
    ])
    expect(summary.failures).toEqual([{ id: "sf-bla-01", checks: ["calledExpectedTool"] }])
    expect([summary.passed, summary.failed]).toEqual([1, 1])
  })

  it("counts an answer with an error apart, and tallies none of its checks", () => {
    const summary = summarize([row("sf-data-01", [["completed", false]], "Unavailable: sf-data")])
    expect(summary.errors).toEqual([{ id: "sf-data-01", error: "Unavailable: sf-data" }])
    expect([summary.checks, summary.passed, summary.failed]).toEqual([[], 0, 0])
  })
})
