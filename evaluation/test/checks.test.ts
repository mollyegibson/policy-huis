import { describe, expect, it } from "@effect/vitest"

import {
  calledExpectedTool,
  calledWithArguments,
  citationIdsExact,
  citedExpectedProvisions,
  citesFigures,
  citesNothing,
  completed,
  expectedFacts,
  mentions,
  normalizeText,
  numbersIn
} from "../src/checks.ts"
import { answer, lookup, ordinance } from "./fixtures.ts"

const relativeMoveIn = ordinance("37.9(a)(8)(ii)")
const cite = `[${relativeMoveIn.citationId}]`

describe("numbersIn", () => {
  it("reads numbers without thousands separators or leading zeros", () => {
    expect(numbersIn("10,100 units, 1.6%, on 2026-03-01")).toEqual(["10100", "1.6", "2026", "3", "1"])
  })

  it("reads digits grouped by a narrow no-break space as one number, as gpt-oss:20b wrote on November 11, 2026", () => {
    expect(numbersIn("| BP Approved | 2\u202f414 units | 1\u00a0502 | 7 115 |")).toEqual(["2414", "1502", "7", "115"])
    expect(numbersIn("effective June 29\u202f2026")).toEqual(["29", "2026"])
  })
})

describe("completed", () => {
  it("fails an answer that stopped at the step limit, with the backend's message", () => {
    const stopped = { ...answer("Partial."), outcome: "step_limit", message: "The agent ran out of steps." }
    expect(completed(stopped)).toMatchObject({ pass: false, reason: "Outcome step_limit: The agent ran out of steps." })
  })
})

describe("calledExpectedTool", () => {
  it("passes when any expected tool was called and names the calls when none was", () => {
    const searched = answer("A.", { lookups: [lookup("sf_docs_search_policy", { query: "rent" })] })
    expect(calledExpectedTool(searched, ["sf_docs_search_policy", "sf_docs_get_provision"]).pass).toBe(true)
    expect(calledExpectedTool(answer("I don't have that data."), ["sf_docs_search_policy"])).toMatchObject({
      pass: false,
      reason: "Expected one of sf_docs_search_policy; called none"
    })
  })
})

describe("calledWithArguments", () => {
  const counted = answer("A.", {
    lookups: [lookup("sf_data_eviction_notice_counts", { from: "2025-01", to: "2025-12", neighborhood: "mission" })]
  })

  it("matches some call of an expected tool on every expected argument, without case", () => {
    const expected = { neighborhood: "Mission", from: "2025-01", to: "2025-12" }
    expect(calledWithArguments(counted, ["sf_data_eviction_notice_counts"], expected).pass).toBe(true)
  })

  it("fails when an argument differs, or only another tool had it", () => {
    expect(calledWithArguments(counted, ["sf_data_eviction_notice_counts"], { to: "2025-06" }).pass).toBe(false)
    expect(calledWithArguments(counted, ["sf_data_eviction_grounds"], { neighborhood: "Mission" }).pass).toBe(false)
  })
})

describe("citationIdsExact", () => {
  it("passes when every citation ID in the answer was sent", () => {
    const sent = answer(`A relative may move in only in some cases ${cite}.`, { citations: [relativeMoveIn] })
    expect(citationIdsExact(sent).pass).toBe(true)
  })

  it("fails on an ID that was never sent, or one mangled so it is no longer well formed", () => {
    const invented = answer(`Yes [sf_docs.rent_ordinance@2026-06-29#37.9(a)(9)].`, { citations: [relativeMoveIn] })
    expect(citationIdsExact(invented)).toMatchObject({
      pass: false,
      reason: "Not sent for this question: sf_docs.rent_ordinance@2026-06-29#37.9(a)(9)"
    })
    const mangled = answer(`Yes [sf_docs.rent_ordinance#37.9(a)(8)(ii)].`, { citations: [relativeMoveIn] })
    expect(citationIdsExact(mangled).pass).toBe(false)
  })

  it("fails a marker holding only the part after #, as gpt-oss:20b wrote on November 11, 2026", () => {
    const partOnly = answer("The increase is 1.6%.\n[6b56a3fe0ccdd6cc]", { citations: [relativeMoveIn] })
    expect(citationIdsExact(partOnly)).toMatchObject({
      pass: false,
      reason: "Not sent for this question: 6b56a3fe0ccdd6cc"
    })
  })

  it("fails a sent ID in lenticular brackets, which the browser app does not show as a source", () => {
    const lenticular = answer(`It is 1.6%【${relativeMoveIn.citationId}】.`, { citations: [relativeMoveIn] })
    expect(citationIdsExact(lenticular)).toMatchObject({
      pass: false,
      reason: `Not in square brackets: 【${relativeMoveIn.citationId}】`
    })
  })

  it("does not read a Markdown link's text as a citation", () => {
    expect(citationIdsExact(answer("See [sf.gov](https://sf.gov) and [Sec. 37.9](https://example.org).")).pass).toBe(
      true
    )
  })
})

describe("citedExpectedProvisions", () => {
  it("accepts the provision or a subsection of it, but not a sibling that shares its prefix", () => {
    const deeper = answer(`Yes [${ordinance("37.9(a)(8)(ii)(A)").citationId}].`)
    expect(citedExpectedProvisions(deeper, "rent_ordinance", ["37.9(a)(8)(ii)"]).pass).toBe(true)
    const sibling = answer(`Yes [${ordinance("37.9A(e)(2)").citationId}].`)
    expect(citedExpectedProvisions(sibling, "rent_ordinance", ["37.9"]).pass).toBe(false)
  })

  it("does not count a broader provision than the one expected", () => {
    const broader = answer(`Yes [${ordinance("37.9(a)").citationId}].`)
    expect(citedExpectedProvisions(broader, "rent_ordinance", ["37.9(a)(8)(ii)"]).pass).toBe(false)
  })
})

describe("citesFigures", () => {
  it("accepts a table cited at its caption, and figures restated after their citation, as Claude wrote on November 11, 2026", () => {
    const answered = answer(
      `**Progress by income group** ${cite}\n\n| Group | Goal |\n|---|---|\n| Moderate | 13,717 |\n\n` +
        "So 9,581 may not all be finished homes."
    )
    expect(citesFigures(answered, "How far behind is San Francisco?").pass).toBe(true)
  })

  it("does not count list numbering, bold or not, or numbers the question states, as figures", () => {
    expect(citesFigures(answer("**3. Some tenants are protected.**\n1. Ask the board."), "Q?").pass).toBe(true)
    expect(citesFigures(answer("I have no data on rent burden in 2024."), "Burden in 2024?").pass).toBe(true)
  })

  it("does not count numbered headings, references to laws or decades as figures", () => {
    const answered = answer(
      "## 7. Paperwork\nSee Planning Code (Section 415), Sec. 37.9(a), §37.3(a)(1) and Chapter 37, as in the late 1990s."
    )
    expect(citesFigures(answered, "Q?")).toMatchObject({ pass: true, reason: "States no figures" })
  })

  it("fails an answer that states figures and cites nothing", () => {
    expect(citesFigures(answer("Chapter 37 allows a 1.6% increase from 2026."), "Q?")).toMatchObject({
      pass: false,
      reason: "States figures with no citation at all: 1.6, 2026"
    })
  })
})

describe("normalizeText", () => {
  it("reads Unicode spaces and hyphens as plain ones, and drops the space before a percent sign", () => {
    expect(normalizeText("1.6\u202f% for rent\u2011controlled units in March\u00a01")).toBe(
      "1.6% for rent-controlled units in march 1"
    )
  })
})

describe("expectedFacts", () => {
  it("passes when each fact appears in one of its forms, after normalizing", () => {
    const answered = answer("It set a 1.6\u202f% increase for extremely low\u2011income units.")
    expect(expectedFacts(answered, [["1.6%", "1.6 percent"], ["extremely low-income"]]).pass).toBe(true)
  })

  it("names each missing fact", () => {
    expect(expectedFacts(answer("It rose."), [["1.6%", "1.6 percent"]])).toMatchObject({
      pass: false,
      reason: 'Missing: "1.6%" or "1.6 percent"'
    })
  })
})

describe("mentions and citesNothing", () => {
  it("passes a mention without case, and fails an answer that cites anything", () => {
    expect(mentions(answer("Ask the rent board."), ["Rent Board"]).pass).toBe(true)
    expect(citesNothing(answer(`No data for Oakland ${cite}.`)).pass).toBe(false)
    expect(citesNothing(answer("I have no data on Oakland.")).pass).toBe(true)
  })
})
