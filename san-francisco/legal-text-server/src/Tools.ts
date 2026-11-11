import { Schema } from "effect"
import { Tool, Toolkit } from "effect/ai"

import { DataErrors, IsoDate, NonNegativeInt, OptionalParam, UnknownValue } from "@policyhuis/mcp-kit"
import { LegalCitation } from "@policyhuis/protocol/Citation"

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

const Citations = Schema.Array(LegalCitation)

const DocumentId = Schema.NonEmptyString.annotate({ description: "A document ID, such as appears in tool results" })
const ProvisionNumber = Schema.NonEmptyString.annotate({
  description: "A section or subsection number, such as appears in tool results, e.g. 37.9(a)(8)"
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

export const SearchPolicy = Tool.make("search_policy", {
  description:
    "Search the loaded laws and policies for the provisions most relevant to a question, best first. A result whose " +
    "childCount is above zero may hold its substance in its subsections: get them with get_provision.",
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
})

export const GetProvision = Tool.make("get_provision", {
  description:
    "Return one section or subsection with all its subsections, in document order. A provision too long to return " +
    "whole comes back with an outline of its subsections instead; ask for the one you need.",
  parameters: Schema.Struct({ documentId: DocumentId, provision: ProvisionNumber }),
  success: Schema.Struct({
    passages: Schema.Array(Passage),
    outline: Schema.NullOr(Schema.Array(OutlineEntry)).annotate({
      description: "The provision's subsections, when it is too long to return with them; otherwise null"
    }),
    citations: Citations
  }),
  failure: Schema.Union([UnknownValue, ProvisionNotFound, ...DataErrors]),
  failureMode: "return"
})

export const ListProvisions = Tool.make("list_provisions", {
  description:
    "List a document's sections, or one provision's subsections, with a one-line summary of each. Use it to browse " +
    "a document when a question asks for every rule of a kind, or when search finds nothing relevant. Quote a " +
    "provision only from get_provision or search_policy.",
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
})

export const SfLegalTextToolkit = Toolkit.make(SearchPolicy, GetProvision, ListProvisions)
