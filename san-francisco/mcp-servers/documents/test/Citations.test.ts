import { describe, expect, it } from "@effect/vitest"
import { Schema } from "effect"

import { Citation, locator, provisionCitation } from "../src/Citations.ts"
import type { DocumentRow, PassageRow } from "../src/PassageRepo.ts"

const law: DocumentRow = {
  documentId: "rent_ordinance",
  title: "Residential Rent Stabilization and Arbitration Ordinance",
  documentType: "law",
  description: "Rent control.",
  publisher: "San Francisco Residential Rent Stabilization and Arbitration Board",
  versionDate: "2026-06-29",
  sourceUrl: "https://media.api.sf.gov/documents/600_Ordinance_6-29-26.pdf"
}

const report: DocumentRow = {
  ...law,
  documentId: "bla_affordable_housing",
  title: "Funding and Incentivizing Affordable Housing in San Francisco",
  documentType: "report",
  versionDate: "2026-06-05"
}

const passage = (provision: string, context: string, text: string): PassageRow => ({
  documentId: "bla_affordable_housing",
  provision,
  parentProvision: null,
  childCount: 0,
  heading: "3. Financing Strategies",
  context,
  text,
  summary: text
})

describe("locator", () => {
  it("names a law's provision as a section", () => {
    expect(locator(law, passage("37.9(a)(8)", "Sec. 37.9 Evictions", "(8) The landlord seeks…"))).toBe(
      "Sec. 37.9(a)(8)"
    )
  })

  it("names a report's page by its section headings and page number", () => {
    expect(
      locator(
        report,
        passage("3.1.p77", "3. Financing Strategies 1. Establish a Revolving Loan Fund", "A revolving loan fund…")
      )
    ).toBe("3. Financing Strategies 1. Establish a Revolving Loan Fund, p. 77")
  })

  it("names a report's section by its heading", () => {
    expect(locator(report, passage("3.1", "3. Financing Strategies", "1. Establish a Revolving Loan Fund"))).toBe(
      "1. Establish a Revolving Loan Fund"
    )
  })

  it("keeps a slug that contains .p from being read as a page", () => {
    const slug = passage("3.policy-comparison-cost-analysis", "3. Financing Strategies", "Policy Comparison")
    expect(locator(report, slug)).toBe("Policy Comparison")
  })
})

describe("provisionCitation", () => {
  it("cites a report page under the report's namespaced source, following the convention", () => {
    const citation = provisionCitation(report, passage("1.p28", "1. Introduction", "Data from…"), "Data from…")
    expect(Schema.decodeUnknownSync(Citation)(citation).citationId).toBe(
      "sf_docs.bla_affordable_housing@2026-06-05#1.p28"
    )
    expect(citation.locator).toBe("1. Introduction, p. 28")
    expect(citation.documentType).toBe("report")
  })
})
