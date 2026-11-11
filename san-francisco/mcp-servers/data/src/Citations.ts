import { createHash } from "node:crypto"

import { Schema } from "effect"

/** This server's namespace in every `sourceId`, so its IDs stay unique among every server's citations. */
export const NAMESPACE = "sf_data"

const PART = "[A-Za-z0-9_.()-]+"
const SOURCE_ID = `[a-z][a-z0-9_]*\\.${PART}@${PART}`

/**
 * One source a result rests on, in the shape every PolicyHuis MCP server returns in `structuredContent.citations`.
 * `sourceId` is `<namespace>.<key>@<version>`; `citationId` is `<sourceId>#<part>`, where the part here is the query
 * key. `locator` says in words which part of the source the result used.
 */
export const Citation = Schema.Struct({
  citationId: Schema.String.pipe(Schema.check(Schema.isPattern(new RegExp(`^${SOURCE_ID}#${PART}$`)))),
  sourceId: Schema.String.pipe(Schema.check(Schema.isPattern(new RegExp(`^${SOURCE_ID}$`)))),
  title: Schema.String,
  publisher: Schema.NullOr(Schema.String),
  sourceUrl: Schema.String,
  version: Schema.String,
  locator: Schema.NullOr(Schema.String),
  quote: Schema.NullOr(Schema.String)
}).check(
  Schema.makeFilter((c) =>
    !c.sourceId.endsWith(`@${c.version}`)
      ? "sourceId must end with @<version>"
      : !c.citationId.startsWith(`${c.sourceId}#`)
        ? "citationId must start with <sourceId>#"
        : true
  )
)
export type Citation = typeof Citation.Type

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
  readonly locator: string
}

/**
 * A dataset's citation for one query: `sf_data.<datasetKey>@<sourceVersion>`, and the query key of the tool and its
 * parameters, so the same query of the same version always has the same `citationId`.
 */
export const datasetCitation = (input: DatasetCitationInput): Citation => {
  const sourceId = `${NAMESPACE}.${input.datasetKey}@${input.sourceVersion}`
  return Citation.make({
    citationId: `${sourceId}#${queryKey(input.tool, input.parameters)}`,
    sourceId,
    title: input.title,
    publisher: input.publisher,
    sourceUrl: input.sourceUrl,
    version: input.sourceVersion,
    locator: input.locator,
    quote: null
  })
}
