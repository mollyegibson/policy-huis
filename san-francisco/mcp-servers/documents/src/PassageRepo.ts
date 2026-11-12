import { Context, Effect, Layer, Schema } from "effect"
import { SqlClient } from "effect/sql"

import { IsoDate, NonNegativeInt } from "./Formats.ts"

export const DocumentRow = Schema.Struct({
  documentId: Schema.String,
  title: Schema.String,
  documentType: Schema.Literals(["law", "report", "reference"]),
  description: Schema.String,
  publisher: Schema.String,
  versionDate: IsoDate,
  sourceUrl: Schema.String
})
export type DocumentRow = typeof DocumentRow.Type

export const PassageRow = Schema.Struct({
  documentId: Schema.String,
  provision: Schema.String,
  parentProvision: Schema.NullOr(Schema.String),
  childCount: NonNegativeInt,
  heading: Schema.String,
  context: Schema.String,
  text: Schema.String,
  summary: Schema.String
})
export type PassageRow = typeof PassageRow.Type

const ModelRow = Schema.Struct({ embeddingModel: Schema.String })

/** Search ranks at most this many provisions; a tool returns at most 10 of them. */
const POOL = 100

/**
 * Read-only queries over the `sf_docs` schema, which San Francisco's passage pipeline
 * (`san-francisco/ingest/documents`) writes. Every row is decoded with a schema.
 */
export class PassageRepo extends Context.Service<PassageRepo>()("PassageRepo", {
  make: Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient
    const rows = <S extends Schema.Top>(s: S) => Schema.decodeUnknownEffect(Schema.Array(s))

    const passageColumns = sql`
      p.document_id AS "documentId", p.provision, p.parent_provision AS "parentProvision",
      (SELECT count(*)::int FROM sf_docs.passages c
        WHERE c.document_id = p.document_id AND c.parent_provision = p.provision) AS "childCount",
      p.heading, p.context, p.text, p.summary`

    const documents = Effect.fn("PassageRepo.documents")(function* () {
      return yield* rows(DocumentRow)(
        yield* sql`
          SELECT document_id AS "documentId", title, document_type AS "documentType", description, publisher,
                 version_date::text AS "versionDate", source_url AS "sourceUrl"
          FROM sf_docs.documents ORDER BY document_id`
      )
    })

    /** The embedding models the stored search entries were made with: one, or none before the first build. */
    const storedEmbeddingModels = Effect.fn("PassageRepo.storedEmbeddingModels")(function* () {
      const found = yield* rows(ModelRow)(
        yield* sql`SELECT DISTINCT embedding_model AS "embeddingModel" FROM sf_docs.search_entries ORDER BY 1`
      )
      return found.map((r) => r.embeddingModel)
    })

    /**
     * Provisions ranked by the cosine distance of their nearest search entry to `vector`, best first. The distances
     * are computed for every entry, an exact search: the corpus is a few thousand entries, and an index scan would
     * return at most `hnsw.ef_search` entries.
     */
    const search = Effect.fn("PassageRepo.search")(function* (
      vector: ReadonlyArray<number>,
      documentId: string | undefined,
      limit: number
    ) {
      const literal = `[${vector.join(",")}]`
      const inDocument = documentId === undefined ? sql`TRUE` : sql`document_id = ${documentId}`
      return yield* rows(PassageRow)(
        yield* sql`
          WITH scored AS MATERIALIZED (
            SELECT document_id, provision, embedding <=> ${literal}::halfvec AS distance
            FROM sf_docs.search_entries WHERE ${inDocument}
          ),
          best AS (
            SELECT DISTINCT ON (document_id, provision) document_id, provision, distance
            FROM scored ORDER BY document_id, provision, distance
          ),
          ranked AS (SELECT * FROM best ORDER BY distance LIMIT ${POOL})
          SELECT ${passageColumns}
          FROM ranked r JOIN sf_docs.passages p USING (document_id, provision)
          ORDER BY r.distance, p.ordinal
          LIMIT ${limit}`
      )
    })

    /** One provision, or null when it is not in the document. */
    const provision = Effect.fn("PassageRepo.provision")(function* (documentId: string, provision: string) {
      const found = yield* rows(PassageRow)(
        yield* sql`
          SELECT ${passageColumns} FROM sf_docs.passages p
          WHERE p.document_id = ${documentId} AND p.provision = ${provision}`
      )
      return found[0] ?? null
    })

    /** A provision's children, or the document's sections when `parent` is null, in document order. */
    const children = Effect.fn("PassageRepo.children")(function* (documentId: string, parent: string | null) {
      const under = parent === null ? sql`p.parent_provision IS NULL` : sql`p.parent_provision = ${parent}`
      return yield* rows(PassageRow)(
        yield* sql`
          SELECT ${passageColumns} FROM sf_docs.passages p
          WHERE p.document_id = ${documentId} AND ${under}
          ORDER BY p.ordinal`
      )
    })

    return { documents, storedEmbeddingModels, search, provision, children } as const
  })
}) {
  static readonly layer = Layer.effect(this, this.make)
}
