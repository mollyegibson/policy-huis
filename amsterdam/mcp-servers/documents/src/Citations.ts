import { Schema } from "effect"

import type { DocumentRow, PassageRow } from "./PassageRepo.ts"

/** This server's namespace in every `sourceId`, so its IDs stay unique among every server's citations. */
export const NAMESPACE = "ams_docs"

const PART = "[A-Za-z0-9_.()-]+"
const SOURCE_ID = `[a-z][a-z0-9_]*\\.${PART}@${PART}`

/**
 * One source a result rests on, in the shape every PolicyHuis MCP server returns in `structuredContent.citations`.
 * `sourceId` is `<namespace>.<documentId>@<versionDate>`; `citationId` is `<sourceId>#<article>`. `language` is the
 * source language and `machineTranslated` says whether `quote` is a machine translation, so the browser app can label
 * it; the Dutch original is the source of record.
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
  language: Schema.Literals(["nl"]),
  machineTranslated: Schema.Boolean
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
 * Where a passage is, as a reader finds it in the document: a law's article ("artikel 7:248"); a page of a report or
 * reference as its section's headings and page number ("1. Inleiding, p. 28"); and a report's section by its heading.
 */
export const locator = (document: DocumentRow, passage: PassageRow): string => {
  if (document.documentType === "law") return `artikel ${passage.provision}`
  const page = PAGE.exec(passage.provision)?.[1]
  return page === undefined ? passage.textNl : `${passage.context}, p. ${page}`
}

/** A citation of one passage of `document`, quoting `quote` and labeling whether it is a machine translation. */
export const provisionCitation = (
  document: DocumentRow,
  passage: PassageRow,
  quote: string,
  machineTranslated: boolean
): Citation => {
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
    language: "nl",
    machineTranslated
  })
}
