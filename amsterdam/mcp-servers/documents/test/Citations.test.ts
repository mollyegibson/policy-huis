import { describe, expect, it } from "@effect/vitest"
import { Schema } from "effect"

import { Citation, locator, provisionCitation } from "../src/Citations.ts"
import type { DocumentRow, PassageRow } from "../src/PassageRepo.ts"

const law: DocumentRow = {
  documentId: "housing_ordinance",
  title: "Huisvestingsverordening Amsterdam 2024",
  documentType: "law",
  description: "Amsterdam's housing ordinance.",
  publisher: "Gemeente Amsterdam",
  versionDate: "2026-06-05",
  sourceUrl: "https://example.org/housing_ordinance.pdf",
  language: "nl"
}

const report: DocumentRow = {
  ...law,
  documentId: "woningbouwplan",
  title: "Woningbouwplan Amsterdam",
  documentType: "report"
}

const passage = (provision: string, context: string, textNl: string): PassageRow => ({
  documentId: "woningbouwplan",
  provision,
  parentProvision: null,
  childCount: 0,
  heading: "3. Financing",
  context,
  textNl,
  textEn: `EN: ${textNl}`,
  translationModel: "fake/translator@host",
  summary: textNl
})

describe("locator", () => {
  it("names a law's article", () => {
    expect(locator(law, passage("7:248", "Artikel 7:248", "De verhuurder…"))).toBe("artikel 7:248")
  })

  it("names a report's page by its section headings and page number", () => {
    expect(
      locator(report, passage("3.1.p77", "3. Financing 1. Establish a Revolving Loan Fund", "Een revolverend fonds…"))
    ).toBe("3. Financing 1. Establish a Revolving Loan Fund, p. 77")
  })

  it("names a report's section by its heading", () => {
    expect(locator(report, passage("3.1", "3. Financing", "1. Establish a Revolving Loan Fund"))).toBe(
      "1. Establish a Revolving Loan Fund"
    )
  })

  it("keeps a slug that contains .p from being read as a page", () => {
    const slug = passage("3.policy-comparison-cost-analysis", "3. Financing", "Policy Comparison")
    expect(locator(report, slug)).toBe("Policy Comparison")
  })
})

describe("provisionCitation", () => {
  it("cites a report page under the report's namespaced source, following the convention", () => {
    const citation = provisionCitation(report, passage("1.p28", "1. Introduction", "Data from…"), "Data from…", true)
    expect(Schema.decodeUnknownSync(Citation)(citation).citationId).toBe("ams_docs.woningbouwplan@2026-06-05#1.p28")
    expect(citation.locator).toBe("1. Introduction, p. 28")
    expect(citation.language).toBe("nl")
    expect(citation.machineTranslated).toBe(true)
  })
})
