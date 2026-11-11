import { describe, expect, it } from "@effect/vitest"
import { Schema } from "effect"

import { canonicalJson, Citation, datasetCitation, queryKey } from "../src/Citations.ts"

const input = {
  datasetKey: "development_pipeline",
  title: "San Francisco Development Pipeline",
  publisher: "Planning",
  sourceUrl: "https://data.sf.gov/d/6jgi-cpb4",
  sourceVersion: "2026-08-28",
  tool: "development_pipeline_summary",
  parameters: { groupBy: "status", affordableOnly: true },
  locator: "Planning pipeline projects and units by status, projects with affordable units only"
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
  it("namespaces the source and keys the citation by the query", () => {
    const citation = datasetCitation(input)
    expect(citation.sourceId).toBe("sf_data.development_pipeline@2026-08-28")
    expect(citation.citationId).toBe(
      `sf_data.development_pipeline@2026-08-28#${queryKey(input.tool, input.parameters)}`
    )
    expect(citation.version).toBe("2026-08-28")
    expect(citation.locator).toBe(input.locator)
  })

  it("round-trips through the convention's schema", () => {
    const encoded = Schema.encodeSync(Citation)(datasetCitation(input))
    expect(Schema.decodeUnknownSync(Citation)(encoded).citationId).toBe(datasetCitation(input).citationId)
  })

  it("is rejected when its version does not end its sourceId", () => {
    const encoded = { ...Schema.encodeSync(Citation)(datasetCitation(input)), version: "2026-01-01" }
    expect(() => Schema.decodeUnknownSync(Citation)(encoded)).toThrow(/sourceId must end with @<version>/)
  })

  it("is rejected when its citationId is not under its sourceId", () => {
    const encoded = {
      ...Schema.encodeSync(Citation)(datasetCitation(input)),
      citationId: "sf_data.affordable_pipeline@2026-08-28#0123456789abcdef"
    }
    expect(() => Schema.decodeUnknownSync(Citation)(encoded)).toThrow(/citationId must start with <sourceId>#/)
  })
})
