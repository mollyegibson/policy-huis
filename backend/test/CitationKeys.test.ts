import { describe, expect, it } from "@effect/vitest"
import { Prompt, Response } from "effect/ai"

import {
  expandKeys,
  keyIds,
  keyResultParts,
  NO_KEYS,
  splitOpenMarker,
  withKeys,
  withResultKeys
} from "../src/loop/CitationKeys.ts"

const SECTION = "sf_docs.rent_ordinance@2026-06-29#37.9(a)"
const SUBSECTION = "sf_docs.rent_ordinance@2026-06-29#37.9(a)(8)"
const DATASET = "sf_data.development_pipeline@2026-08-28#3f9a1c0e7b2d4a6f"

const citation = (citationId: string) => ({
  citationId,
  sourceId: citationId.slice(0, citationId.indexOf("#")),
  title: "Source",
  sourceUrl: "https://example.org/",
  version: "2026-06-29"
})

const toolResult = (citationIds: ReadonlyArray<string>, isFailure = false) => {
  const content = { passages: [{ text: `See ${citationIds.join(", ")}` }], citations: citationIds.map(citation) }
  return Response.makePart("tool-result", {
    id: "call_1",
    name: "sf_docs_search_policy",
    isFailure,
    providerExecuted: false,
    preliminary: false,
    result: { structuredContent: content },
    encodedResult: { structuredContent: content, content: [{ type: "text", text: JSON.stringify(content) }] },
    modelOutput: [Prompt.textPart({ text: JSON.stringify(content) })]
  })
}

describe("withKeys", () => {
  it("numbers citation IDs in order of first appearance, once each", () => {
    const keys = withKeys(withKeys(NO_KEYS, [SECTION, DATASET]), [DATASET, SUBSECTION])
    expect([...keys.keyOf]).toEqual([
      [SECTION, "C1"],
      [DATASET, "C2"],
      [SUBSECTION, "C3"]
    ])
    expect(keys.idOf.get("C3")).toBe(SUBSECTION)
  })

  it("keys only the citations of successful results", () => {
    const keys = withResultKeys(NO_KEYS, [toolResult([SECTION]), toolResult([DATASET], true)])
    expect([...keys.keyOf.keys()]).toEqual([SECTION])
  })
})

describe("keyIds", () => {
  it("replaces each ID whole, never a shorter ID inside a longer one", () => {
    const keys = withKeys(NO_KEYS, [SECTION, SUBSECTION])
    expect(keyIds(`"${SUBSECTION}" and "${SECTION}"`, keys)).toBe(`"C2" and "C1"`)
  })

  it("leaves an ID with no key, even one that a keyed ID starts", () => {
    const keys = withKeys(NO_KEYS, [SECTION])
    expect(keyIds(SUBSECTION, keys)).toBe(SUBSECTION)
  })
})

describe("keyResultParts", () => {
  it("keys the encoded result and the text the provider sends, leaving other parts as they are", () => {
    const keys = withKeys(NO_KEYS, [SECTION])
    const text = Response.makePart("text", { text: `Not a result: ${SECTION}` })
    const [keyed, other] = keyResultParts([toolResult([SECTION]), text], keys)
    if (keyed?.type !== "tool-result") throw new Error("expected the tool result first")
    const read = JSON.stringify([keyed.encodedResult, keyed.modelOutput])
    expect(read).not.toContain(SECTION)
    expect(read).toContain(String.raw`\"citationId\":\"C1\"`)
    expect(JSON.stringify(keyed.result)).toContain(SECTION)
    expect(other).toBe(text)
  })
})

describe("expandKeys", () => {
  const keys = withKeys(NO_KEYS, [SECTION, DATASET])

  it("writes each key as its full ID in square brackets", () => {
    expect(expandKeys("Evictions need a just cause [C1].", keys)).toBe(`Evictions need a just cause [${SECTION}].`)
  })

  it("splits a list of keys into one marker each, and reads lenticular brackets", () => {
    expect(expandKeys("Both [C1, C2] and [C1; C2] and 【C2】.", keys)).toBe(
      `Both [${SECTION}] [${DATASET}] and [${SECTION}] [${DATASET}] and [${DATASET}].`
    )
  })

  it("keeps a key no result gave, in square brackets, and leaves other brackets alone", () => {
    expect(expandKeys("A [C9]. A table [link](x) and [1].", keys)).toBe("A [C9]. A table [link](x) and [1].")
  })
})

describe("splitOpenMarker", () => {
  it("holds back a citation the next chunk may complete", () => {
    expect(splitOpenMarker("Rent rose [C")).toEqual(["Rent rose ", "[C"])
    expect(splitOpenMarker("Rent rose [C1, C")).toEqual(["Rent rose ", "[C1, C"])
    expect(splitOpenMarker("Rent rose 【")).toEqual(["Rent rose ", "【"])
  })

  it("sends text with no open citation at once", () => {
    expect(splitOpenMarker("Rent rose [C1].")).toEqual(["Rent rose [C1].", ""])
    expect(splitOpenMarker("See [the table")).toEqual(["See [the table", ""])
  })
})
