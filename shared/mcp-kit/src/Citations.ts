import { createHash } from "node:crypto"

import { CitationId, DatasetCitation, SourceId } from "@policyhuis/protocol/Citation"

/** JSON with object keys sorted at every level and `undefined` fields left out, so equal values serialize identically. */
export const canonicalJson = (value: unknown): string => JSON.stringify(sortKeys(value))

const sortKeys = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(sortKeys)
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, v]) => v !== undefined)
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([k, v]) => [k, sortKeys(v)])
    )
  }
  return value
}

/** The first 16 hex characters of the SHA-256 of a tool name and its decoded parameters as canonical JSON. */
export const queryKey = (tool: string, parameters: Readonly<Record<string, unknown>>): string =>
  createHash("sha256").update(canonicalJson({ tool, parameters })).digest("hex").slice(0, 16)

export interface DatasetCitationInput {
  readonly datasetKey: string
  readonly title: string
  readonly publisher: string | null
  readonly sourceUrl: string
  readonly sourceVersion: string
  readonly tool: string
  readonly parameters: Readonly<Record<string, unknown>>
}

/** A dataset citation with its `sourceId` and `citationId` built by the protocol's rule. */
export const datasetCitation = (input: DatasetCitationInput): DatasetCitation => {
  const key = queryKey(input.tool, input.parameters)
  const sourceId = `${input.datasetKey}@${input.sourceVersion}`
  return DatasetCitation.make({
    ...input,
    parameters: { ...input.parameters },
    queryKey: key,
    sourceId: SourceId.make(sourceId),
    citationId: CitationId.make(`${sourceId}#${key}`)
  })
}
