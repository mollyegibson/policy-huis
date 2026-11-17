import { describe, expect, it } from "@effect/vitest"
import { Tool } from "effect/ai"

import { corpusListing, makeAmsDocsToolkit } from "../src/Tools.ts"

const housingOrdinance = {
  documentId: "housing_ordinance",
  documentType: "law",
  description: "Amsterdam's housing ordinance."
}

/** Every description and title in a JSON Schema, as the model reads them. */
const schemaTexts = (node: unknown): ReadonlyArray<string> =>
  Array.isArray(node)
    ? node.flatMap(schemaTexts)
    : typeof node === "object" && node !== null
      ? Object.entries(node).flatMap(([key, value]) =>
          (key === "description" || key === "title") && typeof value === "string" ? [value] : schemaTexts(value)
        )
      : []

describe("corpusListing", () => {
  it("lists each document with its ID, type and description", () => {
    expect(corpusListing([housingOrdinance])).toBe("- housing_ordinance (law): Amsterdam's housing ordinance.")
  })

  it("says when no document is loaded, so the model does not search an empty corpus", () => {
    expect(corpusListing([])).toBe("None are loaded yet.")
  })
})

describe("the tools the model reads", () => {
  it("hold no digit in a description or title, so the model has no figure to repeat without a citation", () => {
    const toolkit = makeAmsDocsToolkit([housingOrdinance])
    const texts = Object.values(toolkit.tools).flatMap((tool) => [
      Tool.getDescription(tool) ?? "",
      ...schemaTexts(Tool.getJsonSchema(tool)),
      ...schemaTexts(Tool.getJsonSchemaFromSchema(tool.successSchema))
    ])
    expect(texts.filter((text) => text.length > 0).length).toBeGreaterThan(10)
    expect(texts.filter((text) => /\d/.test(text))).toEqual([])
  })
})
