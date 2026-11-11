import { describe, expect, it } from "@effect/vitest"
import { Schema } from "effect"

import { Citation } from "../src/Citation.ts"

const citation = {
  citationId: "sf_docs.rent_ordinance@2026-06-29#37.9(a)(8)",
  sourceId: "sf_docs.rent_ordinance@2026-06-29",
  title: "Residential Rent Stabilization and Arbitration Ordinance",
  publisher: "San Francisco Residential Rent Stabilization and Arbitration Board",
  sourceUrl: "https://media.api.sf.gov/documents/600_Ordinance_6-29-26.pdf",
  version: "2026-06-29",
  locator: "Sec. 37.9(a)(8)",
  quote: "The landlord seeks to recover possession in good faith…"
}

const decode = Schema.decodeUnknownSync(Citation)

describe("Citation", () => {
  it("decodes a citation whose IDs follow the rule", () => {
    expect(decode(citation).citationId).toBe(citation.citationId)
  })

  it("rejects a sourceId without a namespace", () => {
    expect(() => decode({ ...citation, sourceId: "rent_ordinance@2026-06-29" })).toThrow(/a source ID/)
  })

  it("rejects a citationId that is not under its sourceId", () => {
    expect(() => decode({ ...citation, citationId: "sf_docs.other@2026-06-29#37.9" })).toThrow(
      /citationId must start with <sourceId>#/
    )
  })

  it("rejects a version that does not end the sourceId", () => {
    expect(() => decode({ ...citation, version: "2025-01-01" })).toThrow(/sourceId must end with @<version>/)
  })
})
