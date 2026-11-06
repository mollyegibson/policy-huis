import { describe, expect, it } from "@effect/vitest"
import { Schema } from "effect"
import { renderToStaticMarkup } from "react-dom/server"

import { Citation } from "@policyhuis/protocol/Citation"

import { datasetCitation, QUERY_1 } from "../questions/fixtures.ts"
import { Answer } from "./Answer.tsx"

const citation = Schema.decodeUnknownSync(Citation)(datasetCitation(QUERY_1))
const citations: ReadonlyMap<string, Citation> = new Map([[citation.citationId, citation]])

const render = (answer: string) => renderToStaticMarkup(<Answer answer={answer} citations={citations} />)

describe("Answer", () => {
  it("renders a Markdown table as a table, keeping citation chips in its cells", () => {
    const html = render(
      ["| District | Units |", "|---|---:|", `| 1 | 101 [${citation.citationId}] |`, "| 2 | 549 |"].join("\n")
    )
    expect(html).toContain("<table")
    expect(html.match(/<tr/g)).toHaveLength(3)
    expect(html).toContain('href="#cite-1"')
    expect(html).not.toContain("|---|")
  })

  it("renders text without a table as paragraphs", () => {
    const html = render(`Most units are in district 6 [${citation.citationId}].`)
    expect(html).not.toContain("<table")
    expect(html).toContain("<p>")
  })
})
