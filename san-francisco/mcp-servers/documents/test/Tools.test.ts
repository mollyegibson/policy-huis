import { describe, expect, it } from "@effect/vitest"

import { corpusListing } from "../src/Tools.ts"

describe("corpusListing", () => {
  it("lists each document with its ID, title, type, version and description", () => {
    expect(
      corpusListing([
        {
          documentId: "rent_ordinance",
          title: "Residential Rent Stabilization and Arbitration Ordinance",
          documentType: "law",
          versionDate: "2026-06-29",
          description: "Rent control."
        }
      ])
    ).toBe(
      "- rent_ordinance: Residential Rent Stabilization and Arbitration Ordinance (law, as of 2026-06-29). Rent control."
    )
  })

  it("says when no document is loaded, so the model does not search an empty corpus", () => {
    expect(corpusListing([])).toBe("None are loaded yet.")
  })
})
