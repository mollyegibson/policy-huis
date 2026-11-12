import { Schema } from "effect"
import { Tool, Toolkit } from "effect/ai"

import { Citation } from "./Citations.ts"
import { IsoDate, NonNegativeInt } from "./Formats.ts"
import { OptionalParam } from "./Params.ts"
import { DataErrors, UnknownValue } from "./ToolErrors.ts"

export class ProvisionNotFound extends Schema.TaggedError<ProvisionNotFound>()("ProvisionNotFound", {
  documentId: Schema.String,
  provision: Schema.String
}) {}

/**
 * The embedding model that turns a search query into a vector could not be reached or returned an unusable vector,
 * so the law could not be searched; `get_provision` and `list_provisions` still work.
 */
export class EmbeddingModelUnavailable extends Schema.TaggedError<EmbeddingModelUnavailable>()(
  "EmbeddingModelUnavailable",
  { model: Schema.String }
) {}

const Citations = Schema.Array(Citation)

const DocumentId = Schema.NonEmptyString.annotate({ description: "A document ID, as the tool description lists them" })
const ProvisionNumber = Schema.NonEmptyString.annotate({
  description: "A section or subsection number, written exactly as tool results write it"
})

export const Passage = Schema.Struct({
  documentId: Schema.String,
  provision: Schema.String,
  parentProvision: Schema.NullOr(Schema.String),
  childCount: NonNegativeInt,
  heading: Schema.String,
  context: Schema.String.annotate({ description: "The section heading and the lead-in text of each provision above" }),
  text: Schema.String,
  versionDate: IsoDate
})

export const OutlineEntry = Schema.Struct({
  provision: Schema.String,
  summary: Schema.String.annotate({
    description: "The section's heading, or the first sentence of the provision's text"
  }),
  childCount: NonNegativeInt
})

const searchPolicy = (corpus: string) =>
  Tool.make("search_policy", {
    description:
      "Search these documents for the provisions most relevant to a question, best first. Use it for any question " +
      "about what one of them says, even when the question does not name the document, and search before saying the " +
      "documents cannot answer. A report is analysis, not law: say so when an answer rests on one. A result whose " +
      "childCount is above zero may hold its substance in its subsections: get them with get_provision." +
      `\n\nThe documents:\n${corpus}`,
    parameters: Schema.Struct({
      query: Schema.NonEmptyString.pipe(
        Schema.check(Schema.isMaxLength(500, { message: "A search query must be at most 500 characters" }))
      ),
      documentId: OptionalParam(DocumentId),
      limit: OptionalParam(
        Schema.Int.pipe(
          Schema.check(Schema.isBetween({ minimum: 1, maximum: 10 }, { message: "limit must be from 1 to 10" }))
        )
      )
    }),
    success: Schema.Struct({ passages: Schema.Array(Passage), citations: Citations }),
    failure: Schema.Union([UnknownValue, EmbeddingModelUnavailable, ...DataErrors]),
    failureMode: "return"
  }).annotate(Tool.Title, "Search the documents")

const getProvision = (documentIds: string) =>
  Tool.make("get_provision", {
    description:
      "Return one section or subsection: its own text, and an outline of its subsections, each with its first " +
      "sentence and how many subsections it has. Ask for each subsection whose full text you need. " +
      `Documents: ${documentIds}.`,
    parameters: Schema.Struct({ documentId: DocumentId, provision: ProvisionNumber }),
    success: Schema.Struct({
      passages: Schema.Array(Passage),
      outline: Schema.Array(OutlineEntry).annotate({
        description: "The provision's subsections, in document order; empty when it has none"
      }),
      citations: Citations
    }),
    failure: Schema.Union([UnknownValue, ProvisionNotFound, ...DataErrors]),
    failureMode: "return"
  }).annotate(Tool.Title, "Read a provision")

const listProvisions = (documentIds: string) =>
  Tool.make("list_provisions", {
    description:
      "List a document's sections, or one provision's subsections, with a one-line summary of each. Use it to browse " +
      "a document when a question asks for every rule of a kind, or when search finds nothing relevant. Quote a " +
      `provision only from get_provision or search_policy. Documents: ${documentIds}.`,
    parameters: Schema.Struct({ documentId: DocumentId, provision: OptionalParam(ProvisionNumber) }),
    success: Schema.Struct({
      parent: Schema.NullOr(Passage).annotate({
        description: "The provision listed, or null for the document's sections"
      }),
      outline: Schema.Array(OutlineEntry),
      citations: Citations
    }),
    failure: Schema.Union([UnknownValue, ProvisionNotFound, ...DataErrors]),
    failureMode: "return"
  }).annotate(Tool.Title, "List provisions")

/** A loaded document, as the tool descriptions list it. */
export interface CorpusDocument {
  readonly documentId: string
  readonly documentType: string
  readonly description: string
}

/**
 * One line per document: its ID, its type, and what it covers, in the corpus file's words. Titles and versions are
 * left out: they hold numbers (a code chapter, a date) that the model would repeat without a citation, and every
 * result carries its document's version and every citation its title.
 */
export const corpusListing = (documents: ReadonlyArray<CorpusDocument>): string =>
  documents.length === 0
    ? "None are loaded yet."
    : documents.map((d) => `- ${d.documentId} (${d.documentType}): ${d.description}`).join("\n")

const documentIdList = (documents: ReadonlyArray<CorpusDocument>): string =>
  documents.length === 0 ? "none loaded yet" : documents.map((d) => d.documentId).join(", ")

/**
 * The server's tools, with the loaded documents written into their descriptions, so the model knows from the tool
 * list alone which documents it can search and their IDs. Built at startup from `sf_docs.documents`.
 */
export const makeSfDocsToolkit = (documents: ReadonlyArray<CorpusDocument>) =>
  Toolkit.make(
    searchPolicy(corpusListing(documents)),
    getProvision(documentIdList(documents)),
    listProvisions(documentIdList(documents))
  )

export type SfDocsToolkit = ReturnType<typeof makeSfDocsToolkit>
