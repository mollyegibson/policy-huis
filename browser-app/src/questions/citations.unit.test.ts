import { describe, expect, it } from "@effect/vitest"
import { Schema } from "effect"

import { Citation } from "@policyhuis/protocol/Citation"

import { groupSources, linkCitations, sourceNumbers } from "./citations.ts"
import { datasetCitation, QUERY_1, QUERY_2 } from "./fixtures.ts"

const first = Schema.decodeUnknownSync(Citation)(datasetCitation(QUERY_1))
const second = Schema.decodeUnknownSync(Citation)(datasetCitation(QUERY_2))
const citations: ReadonlyMap<string, Citation> = new Map([
  [first.citationId, first],
  [second.citationId, second]
])

const link = (answer: string) => linkCitations(answer, citations, sourceNumbers(answer, citations))

describe("linkCitations", () => {
  it("numbers markers by source, so two queries of one dataset share a number", () => {
    expect(link(`A [${first.citationId}] and B [${second.citationId}].`)).toBe("A [1](#cite-1) and B [1](#cite-1).")
  })

  it("shows one chip for markers in a row that lead to the same source", () => {
    expect(link(`A [${first.citationId}] [${second.citationId}].`)).toBe("A [1](#cite-1).")
    expect(link(`A [${first.citationId}][${first.citationId}].`)).toBe("A [1](#cite-1).")
  })

  it("keeps one chip per source for markers in a row that lead to different sources", () => {
    expect(link(`A [${first.citationId}] [sf.other@2026-01-01#ffffffffffffffff].`)).toBe(
      `A [1](#cite-1) [?](#cite-missing "sf.other@2026-01-01#ffffffffffffffff").`
    )
  })

  it("does not merge markers on different lines", () => {
    expect(link(`| 1 | [${first.citationId}] |\n| 2 | [${second.citationId}] |`)).toBe(
      "| 1 | [1](#cite-1) |\n| 2 | [1](#cite-1) |"
    )
  })

  it("links an unknown ID to the missing chip, titled with the ID", () => {
    expect(link("C [sf.other@2026-01-01#ffffffffffffffff].")).toBe(
      `C [?](#cite-missing "sf.other@2026-01-01#ffffffffffffffff").`
    )
  })

  it("keeps a marker followed by a parenthesis from reading as a link", () => {
    expect(link(`D [${first.citationId}](not a link)`)).toBe("D [1](#cite-1)(not a link)")
  })

  it("leaves a marker cut off mid-stream as text", () => {
    const partial = `E [${first.citationId.slice(0, 20)}`
    expect(link(partial)).toBe(partial)
  })
})

describe("groupSources", () => {
  it("lists each cited source once, with every citation of it", () => {
    const answer = `A [${first.citationId}] B [${second.citationId}]`
    const groups = groupSources(citations, sourceNumbers(answer, citations))
    expect(groups.map((group) => [group.number, group.sourceId, group.citations.length])).toEqual([
      [1, first.sourceId, 2]
    ])
  })

  it("leaves out sources received but never cited", () => {
    expect(groupSources(citations, sourceNumbers("No markers.", citations))).toEqual([])
  })
})
