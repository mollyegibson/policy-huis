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

  it("decodes a citation with no jurisdiction, language or machine translation", () => {
    expect(decode(citation).jurisdiction).toBeUndefined()
    expect(decode(citation).language).toBeUndefined()
    expect(decode(citation).machineTranslated).toBeUndefined()
  })

  it("decodes a translated Dutch citation with its jurisdiction", () => {
    const dutch = decode({
      ...citation,
      citationId: "ams_docs.huisvestingsverordening@2026-01-01#7.3",
      sourceId: "ams_docs.huisvestingsverordening@2026-01-01",
      title: "Huisvestingsverordening Amsterdam 2024",
      publisher: "Gemeente Amsterdam",
      sourceUrl: "https://lokaleregelgeving.overheid.nl/CVDR706038",
      version: "2026-01-01",
      locator: "artikel 7.3",
      quote: "Deze verordening is van toepassing op woningen binnen de gemeente Amsterdam.",
      jurisdiction: "Amsterdam",
      language: "nl",
      machineTranslated: true
    })
    expect([dutch.jurisdiction, dutch.language, dutch.machineTranslated]).toEqual(["Amsterdam", "nl", true])
  })

  it("accepts explicit nulls for the optional fields", () => {
    const read = decode({ ...citation, jurisdiction: null, language: null, machineTranslated: null })
    expect([read.jurisdiction, read.language, read.machineTranslated]).toEqual([null, null, null])
  })

  it("rejects a language that is not a string and a machineTranslated that is not a boolean", () => {
    expect(() => decode({ ...citation, language: 1 })).toThrow()
    expect(() => decode({ ...citation, machineTranslated: "yes" })).toThrow()
  })
})
