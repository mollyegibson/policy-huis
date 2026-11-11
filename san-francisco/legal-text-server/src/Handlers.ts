import { Effect } from "effect"

import { DataUnavailable, UnknownValue, withDataErrors } from "@policyhuis/mcp-kit"
import { CitationId, LegalCitation, SourceId } from "@policyhuis/protocol/Citation"

import { SearchConfig } from "./SearchConfig.ts"
import type { DocumentRow, PassageRow } from "./PassageRepo.ts"
import { PassageRepo } from "./PassageRepo.ts"
import { QueryEmbedder } from "./QueryEmbedder.ts"
import { SfLegalTextToolkit, ProvisionNotFound } from "./Tools.ts"

/** Search returns this many provisions when the caller gives no limit: the depth spike S4 set its threshold at. */
const DEFAULT_LIMIT = 10

/** A citation of one provision, quoting `quote`, with its IDs built by the protocol's rule. */
const cite = (document: DocumentRow, provision: string, quote: string) => {
  const sourceId = `${document.documentId}@${document.versionDate}`
  return LegalCitation.make({
    sourceId: SourceId.make(sourceId),
    citationId: CitationId.make(`${sourceId}#${provision}`),
    documentId: document.documentId,
    documentTitle: document.title,
    documentType: document.documentType,
    provision,
    versionDate: document.versionDate,
    quote,
    publisher: document.publisher,
    sourceUrl: document.sourceUrl
  })
}

const toPassage = (document: DocumentRow, row: PassageRow) => ({
  documentId: row.documentId,
  provision: row.provision,
  parentProvision: row.parentProvision,
  childCount: row.childCount,
  heading: row.heading,
  context: row.context,
  text: row.text,
  versionDate: document.versionDate
})

const toOutlineEntry = (row: PassageRow) => ({
  provision: row.provision,
  summary: row.summary,
  childCount: row.childCount
})

export const SfLegalTextHandlers = SfLegalTextToolkit.toLayer(
  Effect.gen(function* () {
    const repo = yield* PassageRepo
    const embedder = yield* QueryEmbedder
    const { subtreeChars } = yield* SearchConfig

    /** The loaded document `documentId`, or `UnknownValue` listing the loaded documents. */
    const document = Effect.fn("LegalText.document")(function* (documentId: string) {
      const documents = yield* repo.documents()
      const found = documents.find((d) => d.documentId === documentId)
      if (found === undefined) {
        return yield* new UnknownValue({
          field: "documentId",
          value: documentId,
          validValues: documents.map((d) => d.documentId)
        })
      }
      return found
    })

    /** Each row with its document, which every passage has, since `passages.document_id` references it. */
    const withDocuments = Effect.fn("LegalText.withDocuments")(function* (
      documents: ReadonlyArray<DocumentRow>,
      rows: ReadonlyArray<PassageRow>
    ) {
      const byId = new Map(documents.map((d) => [d.documentId, d]))
      const pairs: Array<{ readonly row: PassageRow; readonly document: DocumentRow }> = []
      for (const row of rows) {
        const owner = byId.get(row.documentId)
        if (owner === undefined) return yield* Effect.die(new Error(`A passage of unknown document ${row.documentId}`))
        pairs.push({ row, document: owner })
      }
      return pairs
    })

    return {
      search_policy: Effect.fn("LegalText.search_policy")(
        function* (params) {
          const documents = yield* repo.documents()
          if (documents.length === 0) return yield* new DataUnavailable({ datasets: [] })
          if (params.documentId !== undefined) yield* document(params.documentId)
          const vector = yield* embedder.embed(params.query)
          const found = yield* withDocuments(
            documents,
            yield* repo.search(vector, params.documentId, params.limit ?? DEFAULT_LIMIT)
          )
          return {
            passages: found.map(({ row, document: owner }) => toPassage(owner, row)),
            citations: found.map(({ row, document: owner }) => cite(owner, row.provision, row.text))
          }
        },
        withDataErrors((params) => (params.documentId === undefined ? [] : [params.documentId]))
      ),

      get_provision: Effect.fn("LegalText.get_provision")(
        function* (params) {
          const doc = yield* document(params.documentId)
          const tree = yield* repo.subtree(params.documentId, params.provision)
          const root = tree[0]
          if (root === undefined) {
            return yield* new ProvisionNotFound({ documentId: params.documentId, provision: params.provision })
          }
          const size = tree.reduce((total, row) => total + row.text.length, 0)
          const whole = size <= subtreeChars
          const returned = whole ? tree : [root]
          return {
            passages: returned.map((row) => toPassage(doc, row)),
            outline: whole ? null : tree.filter((row) => row.parentProvision === root.provision).map(toOutlineEntry),
            citations: returned.map((row) => cite(doc, row.provision, row.text))
          }
        },
        withDataErrors((params) => [params.documentId])
      ),

      list_provisions: Effect.fn("LegalText.list_provisions")(
        function* (params) {
          const doc = yield* document(params.documentId)
          let parent: PassageRow | null = null
          if (params.provision !== undefined) {
            parent = yield* repo.provision(params.documentId, params.provision)
            if (parent === null) {
              return yield* new ProvisionNotFound({ documentId: params.documentId, provision: params.provision })
            }
          }
          const listed = yield* repo.children(params.documentId, parent?.provision ?? null)
          return {
            parent: parent === null ? null : toPassage(doc, parent),
            outline: listed.map(toOutlineEntry),
            citations: [
              ...(parent === null ? [] : [cite(doc, parent.provision, parent.text)]),
              ...listed.map((row) => cite(doc, row.provision, row.summary))
            ]
          }
        },
        withDataErrors((params) => [params.documentId])
      )
    }
  })
)
