import type { Citation } from "@policyhuis/protocol/Citation"

/** A citation marker: a `citationId`, which is `<sourceId>#<part>`, in square brackets. */
const MARKER_SOURCE = String.raw`\[([^[\]\s]+@[^[\]\s]+#[^[\]\s]+)\]`
const MARKER = new RegExp(MARKER_SOURCE, "g")

/** Markers in a row, separated only by spaces or tabs, never by a line break or other text. */
const MARKER_RUN = new RegExp(`${MARKER_SOURCE}(?:[ \t]*${MARKER_SOURCE})*`, "g")

/** The link target of a marker whose ID matches no citation received. */
export const MISSING_CITATION = "#cite-missing"

/** The link target of the chip for source number `n`. */
export const citationHref = (n: number) => `#cite-${String(n)}`

/** Source numbers in order of first use in the answer, by `sourceId`. */
export const sourceNumbers = (
  answer: string,
  citations: ReadonlyMap<string, Citation>
): ReadonlyMap<string, number> => {
  const numbers = new Map<string, number>()
  for (const [, citationId] of answer.matchAll(MARKER)) {
    const citation = citationId === undefined ? undefined : citations.get(citationId)
    if (citation !== undefined && !numbers.has(citation.sourceId)) numbers.set(citation.sourceId, numbers.size + 1)
  }
  return numbers
}

/**
 * Replaces markers with Markdown links that the answer's link component renders as citation chips: to the source's
 * number, or to `MISSING_CITATION`, titled with the unmatched ID, when no citation has that ID. Markers in a row that
 * lead to the same chip (two queries of one source, or one ID repeated) become one chip; markers apart keep their own.
 */
export const linkCitations = (
  answer: string,
  citations: ReadonlyMap<string, Citation>,
  numbers: ReadonlyMap<string, number>
): string =>
  answer.replace(MARKER_RUN, (run) => {
    const links = [...run.matchAll(MARKER)].map(([, citationId = ""]) => {
      const citation = citations.get(citationId)
      const n = citation === undefined ? undefined : numbers.get(citation.sourceId)
      return n === undefined ? `[?](${MISSING_CITATION} "${citationId}")` : `[${String(n)}](${citationHref(n)})`
    })
    return [...new Set(links)].join(" ")
  })

/** One source in the sources list: its number, and every citation of it, in the order received. */
export interface SourceGroup {
  readonly number: number
  readonly sourceId: string
  readonly citations: ReadonlyArray<Citation>
}

/** The cited sources, in the order of their numbers; sources received but never cited in the answer are left out. */
export const groupSources = (
  citations: ReadonlyMap<string, Citation>,
  numbers: ReadonlyMap<string, number>
): ReadonlyArray<SourceGroup> =>
  [...numbers.entries()]
    .map(([sourceId, number]) => ({
      number,
      sourceId,
      citations: [...citations.values()].filter((citation) => citation.sourceId === sourceId)
    }))
    .sort((a, b) => a.number - b.number)
