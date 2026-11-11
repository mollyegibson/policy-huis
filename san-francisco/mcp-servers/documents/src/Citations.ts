import { Schema } from "effect"

import type { DocumentRow, PassageRow } from "./PassageRepo.ts"

/** This server's namespace in every `sourceId`, so its IDs stay unique among every server's citations. */
export const NAMESPACE = "sf_docs"

const PART = "[A-Za-z0-9_.()-]+"
const SOURCE_ID = `[a-z][a-z0-9_]*\\.${PART}@${PART}`

/**
 * One source a result rests on, in the shape every PolicyHuis MCP server returns in `structuredContent.citations`.
 * `sourceId` is `<namespace>.<documentId>@<versionDate>`; `citationId` is `<sourceId>#<provision>`. `documentType` is
 * this server's own addition, so the model can tell a law from an analysis report; the backend ignores it.
 */
export const Citation = Schema.Struct({
  citationId: Schema.String.pipe(Schema.check(Schema.isPattern(new RegExp(`^${SOURCE_ID}#${PART}$`)))),
  sourceId: Schema.String.pipe(Schema.check(Schema.isPattern(new RegExp(`^${SOURCE_ID}$`)))),
  title: Schema.String,
  publisher: Schema.NullOr(Schema.String),
  sourceUrl: Schema.String,
  version: Schema.String,
  locator: Schema.NullOr(Schema.String),
  quote: Schema.NullOr(Schema.String),
  documentType: Schema.Literals(["law", "report", "reference"])
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

const PAGE = /\.p(\d+)$/

/**
 * Where a passage is, as a reader finds it in the document: a law's provision as a section ("Sec. 37.9(a)(8)"); a
 * page of a report or reference as its section's headings and page number ("1. Introduction, p. 28"); and a report's
 * section by its heading, which is its own text.
 */
export const locator = (document: DocumentRow, passage: PassageRow): string => {
  if (document.documentType === "law") return `Sec. ${passage.provision}`
  const page = PAGE.exec(passage.provision)?.[1]
  return page === undefined ? passage.text : `${passage.context}, p. ${page}`
}

/** A citation of one passage of `document`, quoting `quote` verbatim. */
export const provisionCitation = (document: DocumentRow, passage: PassageRow, quote: string): Citation => {
  const provision = passage.provision
  const sourceId = `${NAMESPACE}.${document.documentId}@${document.versionDate}`
  return Citation.make({
    citationId: `${sourceId}#${provision}`,
    sourceId,
    title: document.title,
    publisher: document.publisher,
    sourceUrl: document.sourceUrl,
    version: document.versionDate,
    locator: locator(document, passage),
    quote,
    documentType: document.documentType
  })
}
