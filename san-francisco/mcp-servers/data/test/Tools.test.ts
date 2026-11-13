import { describe, expect, it } from "@effect/vitest"
import { Tool } from "effect/ai"

import { makeSfDataToolkit } from "../src/Tools.ts"

/** Every description and title in a JSON Schema, as the model reads them. */
const schemaTexts = (node: unknown): ReadonlyArray<string> =>
  Array.isArray(node)
    ? node.flatMap(schemaTexts)
    : typeof node === "object" && node !== null
      ? Object.entries(node).flatMap(([key, value]) =>
          (key === "description" || key === "title") && typeof value === "string" ? [value] : schemaTexts(value)
        )
      : []

describe("the tools the model reads", () => {
  it("hold no digit in a description or title, so the model has no figure to repeat without a citation", () => {
    const texts = Object.values(makeSfDataToolkit(["dataset_a", "dataset_b"]).tools).flatMap((tool) => [
      Tool.getDescription(tool) ?? "",
      ...schemaTexts(Tool.getJsonSchema(tool)),
      ...schemaTexts(Tool.getJsonSchemaFromSchema(tool.successSchema))
    ])
    expect(texts.filter((text) => text.length > 0).length).toBeGreaterThan(10)
    expect(texts.filter((text) => /\d/.test(text))).toEqual([])
  })
})
