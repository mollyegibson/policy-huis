import type { Answer } from "./Answer.ts"

/** A check's verdict, in the shape of promptfoo's `GradingResult`. */
export interface Verdict {
  readonly pass: boolean
  readonly score: number
  readonly reason: string
}

const verdict = (pass: boolean, reason: string): Verdict => ({ pass, score: pass ? 1 : 0, reason })

/** A well-formed citation marker: a `citationId` (`<sourceId>#<part>`) in square brackets, as the browser app reads it. */
const MARKER = /\[([^[\]\s]+@[^[\]\s]+#[^[\]\s]+)\]/g

/**
 * Anything the answer puts in square brackets as one token with a digit, `.` or `#` in it, other than a Markdown
 * link's text: a citation marker, well-formed or not, so a mangled ID (only the part after `#`, a missing version) is
 * still caught as a citation that matches nothing sent.
 */
const CANDIDATE_SOURCE = String.raw`\[((?=[^[\]\s]*[\d.#])[^[\]\s]+)\](?!\()`
const CANDIDATE = new RegExp(CANDIDATE_SOURCE, "g")

/** The citation IDs the answer's well-formed markers name, in order, with repeats. */
export const citedIds = (text: string): ReadonlyArray<string> =>
  [...text.matchAll(MARKER)].flatMap(([, id]) => (id === undefined ? [] : [id]))

/** Everything the answer writes in square brackets that looks like a citation ID. */
export const citationCandidates = (text: string): ReadonlyArray<string> =>
  [...text.matchAll(CANDIDATE)].flatMap(([, id]) => (id === undefined ? [] : [id]))

/** The prefix of every citation ID of one docs server document. */
export const documentCitationPrefix = (documentId: string): string => `sf_docs.${documentId}@`

/** The answer's text without its citation markers. */
const withoutMarkers = (text: string): string => text.replace(CANDIDATE, " ")

/**
 * A list item's or heading's number (bold or not) or bullet at the start of a line, which is layout rather than a
 * figure: `1. `, `**3.** `, `- `, `## 7. `.
 */
const LIST_MARKER = /^\s*(?:#+\s*)?(?:[-*+]|\**\d+[.)])\s+/

/**
 * A reference to a part of a law or code (`Section 415`, `Sec. 37.9(a)`, `§37.3(a)(1)`, `Chapter 37`), or a decade
 * (`1990s`): numbers that name something rather than state a figure.
 */
const NOT_A_FIGURE = /(?:§§?\s*|\b(?:Sections?|Secs?\.|Chapters?|Articles?)\s+)\d[\dA-Za-z.()-]*|\b\d{3}0s\b/gi

/** A line without its list marker, its table's cell borders, or its references to laws and decades. */
const content = (line: string): string => line.replace(LIST_MARKER, "").replaceAll("|", " ").replace(NOT_A_FIGURE, " ")

/**
 * A number, its digits grouped in thousands by commas or by the spaces some models write between groups (no-break,
 * narrow no-break or thin), so "2\u202f414" is one number; a group is exactly three digits, so "June 29\u202f2026"
 * stays two numbers.
 */
const NUMBER = /\d+(?:[,\u00a0\u202f\u2009]\d{3}(?!\d))*(?:\.\d+)?/g

const THOUSANDS = /[,\u00a0\u202f\u2009]/g

/** A matched number as a canonical string: its thousands separators and leading or trailing zeros removed. */
const canonical = (n: string): string => String(Number(n.replace(THOUSANDS, "")))

/**
 * The numbers written in `text`, each normalized as a number, so "10,100" or "10\u202f100" in an answer matches 10100
 * in a result and "03" in a date matches "3".
 */
export const numbersIn = (text: string): ReadonlyArray<string> => [...text.matchAll(NUMBER)].map(([n]) => canonical(n))

/** The question ended with an answer, not a step limit, context limit or truncation. */
export const completed = (answer: Answer): Verdict =>
  answer.outcome === "answered"
    ? verdict(true, "Answered")
    : verdict(false, `Outcome ${answer.outcome ?? "missing"}${answer.message === null ? "" : `: ${answer.message}`}`)

/** At least one of `tools` was called. */
export const calledExpectedTool = (answer: Answer, tools: ReadonlyArray<string>): Verdict => {
  const called = answer.lookups.map((lookup) => lookup.tool)
  return called.some((tool) => tools.includes(tool))
    ? verdict(true, `Called ${called.join(", ")}`)
    : verdict(false, `Expected one of ${tools.join(", ")}; called ${called.length === 0 ? "none" : called.join(", ")}`)
}

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

/** Some call of one of `tools` has every argument in `expected`, compared as text without case. */
export const calledWithArguments = (
  answer: Answer,
  tools: ReadonlyArray<string>,
  expected: Readonly<Record<string, string>>
): Verdict => {
  const calls = answer.lookups.filter((lookup) => tools.includes(lookup.tool))
  const matches = calls.some(
    (call) =>
      isRecord(call.arguments) &&
      Object.entries(expected).every(([key, value]) => {
        const actual = isRecord(call.arguments) ? call.arguments[key] : undefined
        return (
          (typeof actual === "string" || typeof actual === "number") &&
          String(actual).toLowerCase() === value.toLowerCase()
        )
      })
  )
  return matches
    ? verdict(true, `A call had ${JSON.stringify(expected)}`)
    : verdict(
        false,
        `No call of ${tools.join(", ")} had ${JSON.stringify(expected)}; calls: ${JSON.stringify(calls.map((c) => c.arguments))}`
      )
}

/** A citation ID in lenticular brackets (【…】), which gpt-oss writes and the browser app does not read as a citation. */
const LENTICULAR = /【([^【】\s]+)】/g

/**
 * Every citation-like ID in the answer is one the backend sent for this question, character for character, in square
 * brackets: a marker in other brackets shows in the browser app as text, not as a source.
 */
export const citationIdsExact = (answer: Answer): Verdict => {
  const sent = new Set<string>(answer.citations.map((citation) => citation.citationId))
  const unknown = [...new Set(citationCandidates(answer.text))].filter((id) => !sent.has(id))
  const misbracketed = [...answer.text.matchAll(LENTICULAR)].map(([marker]) => marker)
  const problems = [
    ...(unknown.length === 0 ? [] : [`Not sent for this question: ${unknown.join(", ")}`]),
    ...(misbracketed.length === 0 ? [] : [`Not in square brackets: ${misbracketed.join(", ")}`])
  ]
  return problems.length === 0 ? verdict(true, "Every citation ID was sent") : verdict(false, problems.join("; "))
}

/** The answer cites one of `provisions` of `documentId`, or a subsection of one (`37.9(a)` covers `37.9(a)(8)`). */
export const citedExpectedProvisions = (
  answer: Answer,
  documentId: string,
  provisions: ReadonlyArray<string>
): Verdict => {
  const prefix = documentCitationPrefix(documentId)
  const cited = citedIds(answer.text)
    .filter((id) => id.startsWith(prefix))
    .map((id) => id.slice(id.indexOf("#") + 1))
  const covers = (expected: string, provision: string) => provision === expected || provision.startsWith(`${expected}(`)
  return cited.some((provision) => provisions.some((expected) => covers(expected, provision)))
    ? verdict(true, `Cited ${cited.join(", ")}`)
    : verdict(
        false,
        `Expected ${provisions.join(" or ")} of ${documentId}; cited ${cited.length === 0 ? "none" : cited.join(", ")}`
      )
}

/**
 * Text as it is compared with expected words: lower case, every Unicode space as a plain space, every Unicode hyphen
 * as `-`, and no space before `%`, so "1.6\u202f%" matches "1.6%" and "low\u2011income" matches "low-income".
 */
export const normalizeText = (text: string): string =>
  text
    .toLowerCase()
    .replace(/[\u00a0\u2000-\u200a\u202f\u205f\u3000]/g, " ")
    .replace(/[\u2010-\u2015\u2212]/g, "-")
    .replace(/(\d)\s+%/g, "$1%")

const containsAny = (text: string, forms: ReadonlyArray<string>): boolean =>
  forms.some((form) => normalizeText(text).includes(normalizeText(form)))

/** Each fact appears in at least one of its forms. */
export const expectedFacts = (answer: Answer, facts: ReadonlyArray<ReadonlyArray<string>>): Verdict => {
  const missing = facts.filter((forms) => !containsAny(answer.text, forms))
  return missing.length === 0
    ? verdict(true, "Every fact appears")
    : verdict(false, `Missing: ${missing.map((forms) => forms.map((f) => JSON.stringify(f)).join(" or ")).join("; ")}`)
}

/** At least one of `words` appears. */
export const mentions = (answer: Answer, words: ReadonlyArray<string>): Verdict =>
  containsAny(answer.text, words)
    ? verdict(true, "Mentioned")
    : verdict(false, `Mentions none of ${words.map((w) => JSON.stringify(w)).join(", ")}`)

/** The answer contains no citation marker. */
export const citesNothing = (answer: Answer): Verdict => {
  const markers = citationCandidates(answer.text)
  return markers.length === 0 ? verdict(true, "No citation") : verdict(false, `Cited ${markers.join(", ")}`)
}

/**
 * The numbers the answer states, outside its citation markers, list and heading numbering and references to laws,
 * other than those the question states.
 */
const statedFigures = (answer: Answer, question: string): ReadonlyArray<string> => {
  const asked = new Set(numbersIn(question))
  const text = answer.text
    .split("\n")
    .map((line) => withoutMarkers(content(line)))
    .join("\n")
  return [...new Set(numbersIn(text))].filter((n) => !asked.has(n))
}

/**
 * An answer that states a figure cites at least one source. Where in the answer the citation sits (after each figure,
 * at a table's caption, once for a paragraph) is the answer's presentation and is not checked, and so is whether each
 * figure came from the data: an answer may round or compute a figure, saying so ("about", "roughly").
 */
export const citesFigures = (answer: Answer, question: string): Verdict => {
  const figures = statedFigures(answer, question)
  if (figures.length === 0) return verdict(true, "States no figures")
  return citationCandidates(answer.text).length > 0
    ? verdict(true, "States figures and cites its sources")
    : verdict(false, `States figures with no citation at all: ${figures.join(", ")}`)
}
