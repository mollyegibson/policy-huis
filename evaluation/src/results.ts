import { Schema } from "effect"

const ComponentResult = Schema.Struct({
  pass: Schema.Boolean,
  reason: Schema.optional(Schema.NullOr(Schema.String)),
  assertion: Schema.optional(Schema.NullOr(Schema.Struct({ metric: Schema.optional(Schema.NullOr(Schema.String)) })))
})

/** One graded answer, as promptfoo writes it to a run's `results.json`; only the fields the summary reads. */
export const ResultRow = Schema.Struct({
  success: Schema.Boolean,
  error: Schema.optional(Schema.NullOr(Schema.String)),
  failureReason: Schema.optional(Schema.Number).annotate({
    description: "promptfoo's ResultFailureReason: 0 none, 1 a failed assertion, 2 an error"
  }),
  testCase: Schema.Struct({ vars: Schema.Struct({ id: Schema.String }) }),
  provider: Schema.Struct({ label: Schema.optional(Schema.NullOr(Schema.String)), id: Schema.String }),
  gradingResult: Schema.optional(
    Schema.NullOr(Schema.Struct({ componentResults: Schema.optional(Schema.NullOr(Schema.Array(ComponentResult))) }))
  )
})
export type ResultRow = typeof ResultRow.Type

/** A run's `results.json`, in the shape its `outputPath` writes: the rows under `results.results`. */
export const ResultsFile = Schema.Struct({
  results: Schema.Struct({ results: Schema.Array(ResultRow) })
})

/** promptfoo's `ResultFailureReason.ERROR`: the provider could not get an answer, as opposed to a check failing. */
const ERROR = 2

/** The checks that failed for one answer, by metric name. */
const failedChecks = (row: ResultRow): ReadonlyArray<string> =>
  (row.gradingResult?.componentResults ?? []).flatMap((component) =>
    component.pass ? [] : [component.assertion?.metric ?? "unnamed"]
  )

/** The pass and fail counts of one check, over every answer graded on it. */
export interface CheckTally {
  readonly check: string
  readonly passed: number
  readonly graded: number
}

/** A run's results: each check's tally, each failing or erroring answer, and the counts of answers. */
export interface Summary {
  readonly checks: ReadonlyArray<CheckTally>
  readonly failures: ReadonlyArray<{ readonly id: string; readonly checks: ReadonlyArray<string> }>
  readonly errors: ReadonlyArray<{ readonly id: string; readonly error: string }>
  readonly passed: number
  readonly failed: number
}

/**
 * Summarizes a run. An answer with an error (one the provider could not get, such as a server being unavailable) is
 * counted apart, never as passed or failed, and its checks are not tallied.
 */
export const summarize = (rows: ReadonlyArray<ResultRow>): Summary => {
  const tallies = new Map<string, { passed: number; graded: number }>()
  const failures: Array<{ id: string; checks: ReadonlyArray<string> }> = []
  const errors: Array<{ id: string; error: string }> = []
  let passed = 0
  for (const row of rows) {
    const id = row.testCase.vars.id
    if (row.failureReason === ERROR) {
      errors.push({ id, error: row.error ?? "no message" })
      continue
    }
    for (const component of row.gradingResult?.componentResults ?? []) {
      const check = component.assertion?.metric ?? "unnamed"
      const tally = tallies.get(check) ?? { passed: 0, graded: 0 }
      tallies.set(check, { passed: tally.passed + (component.pass ? 1 : 0), graded: tally.graded + 1 })
    }
    if (row.success) passed += 1
    else failures.push({ id, checks: failedChecks(row) })
  }
  return {
    checks: [...tallies.entries()].map(([check, tally]) => ({ check, ...tally })),
    failures,
    errors,
    passed,
    failed: failures.length
  }
}

/** The rows of each provider (each model configuration asked), in the order they first appear. */
export const byProvider = (
  rows: ReadonlyArray<ResultRow>
): ReadonlyArray<{ readonly label: string; readonly rows: ReadonlyArray<ResultRow> }> => {
  const groups = new Map<string, Array<ResultRow>>()
  for (const row of rows) {
    const label = row.provider.label ?? row.provider.id
    groups.set(label, [...(groups.get(label) ?? []), row])
  }
  return [...groups.entries()].map(([label, grouped]) => ({ label, rows: grouped }))
}

/** The summary as lines of text for the terminal. */
export const formatSummary = (summary: Summary): string => {
  const width = Math.max(...summary.checks.map((tally) => tally.check.length), "Check".length)
  return [
    `${"Check".padEnd(width)}  Passed`,
    ...summary.checks.map((tally) => `${tally.check.padEnd(width)}  ${String(tally.passed)}/${String(tally.graded)}`),
    "",
    ...summary.failures.map((failure) => `FAIL   ${failure.id}: ${failure.checks.join(", ")}`),
    ...summary.errors.map((error) => `ERROR  ${error.id}: ${error.error}`),
    "",
    `${String(summary.passed)} passed, ${String(summary.failed)} failed, ${String(summary.errors.length)} errors`
  ].join("\n")
}
