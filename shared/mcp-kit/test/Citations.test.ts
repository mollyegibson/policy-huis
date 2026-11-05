import { describe, expect, it } from "@effect/vitest"
import { Schema } from "effect"

import { DatasetCitation } from "@policyhuis/protocol/Citation"

import { canonicalJson, datasetCitation, queryKey } from "../src/Citations.ts"

const input = {
  datasetKey: "sf.development_pipeline",
  title: "San Francisco Development Pipeline",
  publisher: "Planning",
  sourceUrl: "https://data.sf.gov/d/6jgi-cpb4",
  sourceVersion: "2026-08-28",
  tool: "development_pipeline_summary",
  parameters: { groupBy: "status", affordableOnly: true }
}

describe("canonicalJson", () => {
  it("sorts keys at every level and drops undefined fields", () => {
    expect(canonicalJson({ b: 1, a: { d: undefined, c: [{ z: 1, y: 2 }] } })).toBe('{"a":{"c":[{"y":2,"z":1}]},"b":1}')
  })
})

describe("queryKey", () => {
  it("is the same for the same parameters in any order", () => {
    expect(queryKey("t", { a: 1, b: "x" })).toBe(queryKey("t", { b: "x", a: 1 }))
  })

  it("differs by tool and by parameters", () => {
    expect(queryKey("t", { a: 1 })).not.toBe(queryKey("u", { a: 1 }))
    expect(queryKey("t", { a: 1 })).not.toBe(queryKey("t", { a: 2 }))
  })

  it("is 16 lowercase hex characters", () => {
    expect(queryKey("t", {})).toMatch(/^[0-9a-f]{16}$/)
  })
})

describe("datasetCitation", () => {
  it("builds IDs from the citation's own fields", () => {
    const citation = datasetCitation(input)
    expect(citation.sourceId).toBe("sf.development_pipeline@2026-08-28")
    expect(citation.citationId).toBe(`sf.development_pipeline@2026-08-28#${queryKey(input.tool, input.parameters)}`)
  })

  it("round-trips through the protocol's schema, which re-checks the IDs", () => {
    const encoded = Schema.encodeSync(DatasetCitation)(datasetCitation(input))
    expect(Schema.decodeUnknownSync(DatasetCitation)(encoded).citationId).toBe(datasetCitation(input).citationId)
  })

  it("is rejected by the protocol's schema when an ID does not match", () => {
    const encoded = { ...Schema.encodeSync(DatasetCitation)(datasetCitation(input)), sourceVersion: "2026-01-01" }
    expect(() => Schema.decodeUnknownSync(DatasetCitation)(encoded)).toThrow(/sourceId must be/)
  })
})
