import { Schema } from "effect"

const PART = "[A-Za-z0-9_.()-]+"
const SOURCE_ID = `[a-z][a-z0-9_]*\\.${PART}@${PART}`

/** One version of one source: `<namespace>.<key>@<version>`, where the namespace is the server that cites it. */
export const SourceId = Schema.String.pipe(
  Schema.check(Schema.isPattern(new RegExp(`^${SOURCE_ID}$`), { message: "a source ID, <namespace>.<key>@<version>" })),
  Schema.brand("SourceId")
)

/** The part of a source a claim rests on: `<sourceId>#<part>`. Answers cite claims with it in square brackets. */
export const CitationId = Schema.String.pipe(
  Schema.check(Schema.isPattern(new RegExp(`^${SOURCE_ID}#${PART}$`), { message: "a citation ID, <sourceId>#<part>" })),
  Schema.brand("CitationId")
)

/**
 * A source behind the answer, as the backend read it from a tool result. Citations with the same `sourceId` are parts
 * of one source. `locator` says in words which part a citation used, such as a section or the data selected; `quote`
 * is the cited text, verbatim. The last three fields are optional and carry what only some sources have: a
 * `jurisdiction` narrower than the server's city, such as Amsterdam's Zuid stadsdeel, when the source covers only that
 * area; a `language` code for `quote`, such as `nl`, when the source is not in the answer's language; and
 * `machineTranslated`, which says `quote` is a machine translation whose original is the source of record.
 */
export const Citation = Schema.Struct({
  citationId: CitationId,
  sourceId: SourceId,
  title: Schema.String,
  publisher: Schema.NullOr(Schema.String),
  sourceUrl: Schema.String,
  version: Schema.String,
  locator: Schema.NullOr(Schema.String),
  quote: Schema.NullOr(Schema.String),
  jurisdiction: Schema.optional(Schema.NullOr(Schema.String)),
  language: Schema.optional(Schema.NullOr(Schema.String)),
  machineTranslated: Schema.optional(Schema.NullOr(Schema.Boolean))
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
