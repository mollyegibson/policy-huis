import { describe, expect, it } from "@effect/vitest"
import { Schema } from "effect"
import { renderToStaticMarkup } from "react-dom/server"

import { Citation } from "@policyhuis/protocol/Citation"

import { datasetCitation, QUERY_1, QUERY_2 } from "../questions/fixtures.ts"
import { Sources } from "./Sources.tsx"

const decode = Schema.decodeUnknownSync(Citation)
const query = decode(datasetCitation(QUERY_1))
const otherQuery = decode({ ...datasetCitation(QUERY_2), locator: "Planning pipeline projects, in Mission" })
const provision = decode({
  citationId: "sf_docs.rent_ordinance@2026-06-29#37.9(a)(8)",
  sourceId: "sf_docs.rent_ordinance@2026-06-29",
  title: "Residential Rent Stabilization and Arbitration Ordinance",
  publisher: "San Francisco Residential Rent Stabilization and Arbitration Board",
  sourceUrl: "https://media.api.sf.gov/documents/600_Ordinance_6-29-26.pdf",
  version: "2026-06-29",
  locator: "Sec. 37.9(a)(8)",
  quote: "The landlord seeks to recover possession in good faith"
})
const citations: ReadonlyMap<string, Citation> = new Map(
  [query, otherQuery, provision].map((c): [string, Citation] => [c.citationId, c])
)

const render = (answer: string) => renderToStaticMarkup(<Sources answer={answer} citations={citations} />)

describe("Sources", () => {
  it("numbers each cited source once, listing every part of it the answer used", () => {
    const html = render(`A [${query.citationId}] B [${otherQuery.citationId}] C [${provision.citationId}].`)
    expect(html).toContain('id="cite-1"')
    expect(html).toContain('id="cite-2"')
    expect(html).not.toContain('id="cite-3"')
    expect(html).toContain("Planning pipeline projects and units by status")
    expect(html).toContain("Planning pipeline projects, in Mission")
  })

  it("shows a provision's locator and its quote", () => {
    const html = render(`C [${provision.citationId}].`)
    expect(html).toContain("Sec. 37.9(a)(8)")
    expect(html).toContain("The landlord seeks to recover possession in good faith")
    expect(html).toContain("version 2026-06-29")
  })

  it("shows nothing when the answer cites no source", () => {
    expect(render("No citations here.")).toBe("")
  })
})
