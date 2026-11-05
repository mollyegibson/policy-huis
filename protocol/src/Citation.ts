import { Schema } from "effect"

import { IsoDate } from "./Formats.ts"

const IdPart = Schema.String.pipe(
  Schema.check(Schema.isPattern(/^[A-Za-z0-9_.()-]+$/, { message: "letters, digits, _ . ( ) - only" }))
)

export const SourceId = Schema.String.pipe(
  Schema.check(Schema.isPattern(/^[A-Za-z0-9_.()-]+@[A-Za-z0-9_.()-]+$/, { message: "a source ID, <key>@<version>" })),
  Schema.brand("SourceId")
)

export const CitationId = Schema.String.pipe(
  Schema.check(
    Schema.isPattern(/^[A-Za-z0-9_.()-]+@[A-Za-z0-9_.()-]+#[A-Za-z0-9_.()-]+$/, {
      message: "a citation ID, <sourceId>#<part>"
    })
  ),
  Schema.brand("CitationId")
)

const idsMatch = (sourceId: string, expectedSource: string, citationId: string, part: string) =>
  sourceId !== expectedSource
    ? `sourceId must be ${expectedSource}`
    : citationId !== `${sourceId}#${part}`
      ? `citationId must be ${sourceId}#${part}`
      : true

export class LegalCitation extends Schema.TaggedClass<LegalCitation>()(
  "LegalCitation",
  Schema.Struct({
    sourceId: SourceId,
    citationId: CitationId,
    documentId: IdPart,
    documentTitle: Schema.String,
    documentType: Schema.Literals(["law", "report", "reference"]),
    provision: IdPart,
    versionDate: IsoDate,
    quote: Schema.String,
    publisher: Schema.String,
    sourceUrl: Schema.String
  }).check(
    Schema.makeFilter((c) => idsMatch(c.sourceId, `${c.documentId}@${c.versionDate}`, c.citationId, c.provision))
  )
) {}

export class DatasetCitation extends Schema.TaggedClass<DatasetCitation>()(
  "DatasetCitation",
  Schema.Struct({
    sourceId: SourceId,
    citationId: CitationId,
    datasetKey: IdPart,
    title: Schema.String,
    publisher: Schema.NullOr(Schema.String),
    sourceUrl: Schema.String,
    sourceVersion: IdPart,
    tool: IdPart,
    parameters: Schema.Record(Schema.String, Schema.Unknown),
    queryKey: Schema.String.pipe(Schema.check(Schema.isPattern(/^[0-9a-f]{16}$/)))
  }).check(
    Schema.makeFilter((c) => idsMatch(c.sourceId, `${c.datasetKey}@${c.sourceVersion}`, c.citationId, c.queryKey))
  )
) {}

export const Citation = Schema.Union([LegalCitation, DatasetCitation])
export type Citation = typeof Citation.Type
