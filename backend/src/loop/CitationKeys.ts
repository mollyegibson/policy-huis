import { Prompt } from "effect/ai"
import type { Response } from "effect/ai"

import { readCitations, structuredContent } from "./ToolResults.ts"

/**
 * One question's short keys for its citation IDs: `C1`, `C2`, … in the order the citations first appear in tool
 * results. The model reads and writes keys, which small models copy reliably where they mangle a full ID such as
 * `sf_docs.rent_ordinance@2026-06-29#37.9(a)(8)`; everything else (the browser, the trace, the evaluation) sees full
 * IDs.
 */
export interface CitationKeys {
  readonly keyOf: ReadonlyMap<string, string>
  readonly idOf: ReadonlyMap<string, string>
}

export const NO_KEYS: CitationKeys = { keyOf: new Map(), idOf: new Map() }

/** The keys, with a new key for each citation ID in `ids` that has none yet. */
export const withKeys = (keys: CitationKeys, ids: Iterable<string>): CitationKeys => {
  const keyOf = new Map(keys.keyOf)
  const idOf = new Map(keys.idOf)
  for (const id of ids) {
    if (keyOf.has(id)) continue
    const key = `C${String(keyOf.size + 1)}`
    keyOf.set(id, key)
    idOf.set(key, id)
  }
  return { keyOf, idOf }
}

/** The keys, extended with every citation that the successful tool results among `parts` return. */
export const withResultKeys = (keys: CitationKeys, parts: ReadonlyArray<Response.AnyPart>): CitationKeys =>
  withKeys(
    keys,
    parts.flatMap((part) =>
      part.type === "tool-result" && !part.isFailure && !part.preliminary
        ? readCitations(structuredContent(part.result)).citations.map((citation) => citation.citationId)
        : []
    )
  )

/** A character that can be part of a citation ID. */
const ID_CHAR = String.raw`[A-Za-z0-9_.()@#-]`

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`)

/**
 * `text` with each keyed citation ID replaced by its key. Longer IDs are tried first, and an ID must stand alone, so
 * `…#37.9(a)` never matches inside `…#37.9(a)(8)`.
 */
export const keyIds = (text: string, keys: CitationKeys): string => {
  if (keys.keyOf.size === 0) return text
  const ids = [...keys.keyOf.keys()].sort((a, b) => b.length - a.length).map(escape)
  const pattern = new RegExp(`(?<!${ID_CHAR})(?:${ids.join("|")})(?!${ID_CHAR})`, "g")
  return text.replace(pattern, (id) => keys.keyOf.get(id) ?? id)
}

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

/** `value` with `f` applied to every string in it, at any depth; anything that is not a string, array or object is kept. */
const mapStrings = (value: unknown, f: (text: string) => string): unknown => {
  if (typeof value === "string") return f(value)
  if (Array.isArray(value)) return value.map((item: unknown) => mapStrings(item, f))
  if (isRecord(value)) {
    const mapped: Record<string, unknown> = { ...value }
    for (const [name, item] of Object.entries(value)) mapped[name] = mapStrings(item, f)
    return mapped
  }
  return value
}

/**
 * The parts as the model reads them: in each tool result, every keyed citation ID replaced by its key, both in the
 * encoded result and in the text the provider sends in its place (`modelOutput`). Other parts are unchanged.
 */
export const keyResultParts = (
  parts: ReadonlyArray<Response.AnyPart>,
  keys: CitationKeys
): ReadonlyArray<Response.AnyPart> =>
  parts.map((part) => {
    if (part.type !== "tool-result") return part
    const key = (text: string) => keyIds(text, keys)
    return {
      ...part,
      encodedResult: mapStrings(part.encodedResult, key),
      ...(part.modelOutput === undefined
        ? {}
        : {
            modelOutput: part.modelOutput.map((out) =>
              out.type === "text" ? Prompt.textPart({ text: key(out.text), options: out.options }) : out
            )
          })
    }
  })

/**
 * A citation the model wrote: one or more keys in square brackets, or in the lenticular brackets (【】) some models
 * write, separated by commas, semicolons or spaces (`[C1]`, `[C1, C3]`, `【C2】`).
 */
const KEY_MARKER = /[[【]\s*(C\d+(?:\s*[,;]?\s*C\d+)*)\s*[\]】]/g

/** Text that may be the start of a citation the rest of the stream completes. */
const OPEN_MARKER = /[[【][\sC\d,;]*$/

/** The longest open marker held back; anything longer is not a citation of keys. */
const MAX_OPEN_MARKER = 64

/**
 * The model's text with each citation of keys written as the full citation IDs, each in its own square brackets, as
 * the browser app reads them. A key no tool result gave is kept as the model wrote it, in square brackets, so the
 * browser shows it as text and the evaluation reports it as a citation that matches nothing.
 */
export const expandKeys = (text: string, keys: CitationKeys): string =>
  text.replace(KEY_MARKER, (_marker, list: string) =>
    (list.match(/C\d+/g) ?? []).map((key) => `[${keys.idOf.get(key) ?? key}]`).join(" ")
  )

/**
 * Splits streamed text into what can be expanded and sent now, and the tail held back because it may be a citation
 * the next chunk completes (`… rent [C`). The held tail is at most `MAX_OPEN_MARKER` characters.
 */
export const splitOpenMarker = (text: string): readonly [ready: string, held: string] => {
  const open = OPEN_MARKER.exec(text)
  if (open === null || text.length - open.index > MAX_OPEN_MARKER) return [text, ""]
  return [text.slice(0, open.index), text.slice(open.index)]
}
