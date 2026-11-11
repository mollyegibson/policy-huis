import { Effect } from "effect"

import { provisionCitation } from "./Citations.ts"
import { SearchConfig } from "./SearchConfig.ts"
import { DataUnavailable, UnknownValue, withDataErrors } from "./ToolErrors.ts"
import type { DocumentRow, PassageRow } from "./PassageRepo.ts"
import { PassageRepo } from "./PassageRepo.ts"
import { QueryEmbedder } from "./QueryEmbedder.ts"
import type { SfDocsToolkit } from "./Tools.ts"
import { ProvisionNotFound } from "./Tools.ts"

/** Search returns this many provisions when the caller gives no limit: the depth spike S4 set its threshold at. */
const DEFAULT_LIMIT = 10

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

/** The handlers of `toolkit`, whichever documents its descriptions list; a tool's handler is found by its name. */
export const SfDocsHandlers = (toolkit: SfDocsToolkit) =>
  toolkit.toLayer(
    Effect.gen(function* () {
      const repo = yield* PassageRepo
      const embedder = yield* QueryEmbedder
      const { subtreeChars } = yield* SearchConfig

      /** The loaded document `documentId`, or `UnknownValue` listing the loaded documents. */
      const document = Effect.fn("SfDocs.document")(function* (documentId: string) {
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
      const withDocuments = Effect.fn("SfDocs.withDocuments")(function* (
        documents: ReadonlyArray<DocumentRow>,
        rows: ReadonlyArray<PassageRow>
      ) {
        const byId = new Map(documents.map((d) => [d.documentId, d]))
        const pairs: Array<{ readonly row: PassageRow; readonly document: DocumentRow }> = []
        for (const row of rows) {
          const owner = byId.get(row.documentId)
          if (owner === undefined)
            return yield* Effect.die(new Error(`A passage of unknown document ${row.documentId}`))
          pairs.push({ row, document: owner })
        }
        return pairs
      })

      return {
        search_policy: Effect.fn("SfDocs.search_policy")(
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
              citations: found.map(({ row, document: owner }) => provisionCitation(owner, row, row.text))
            }
          },
          withDataErrors((params) => (params.documentId === undefined ? [] : [params.documentId]))
        ),

        get_provision: Effect.fn("SfDocs.get_provision")(
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
              citations: returned.map((row) => provisionCitation(doc, row, row.text))
            }
          },
          withDataErrors((params) => [params.documentId])
        ),

        list_provisions: Effect.fn("SfDocs.list_provisions")(
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
                ...(parent === null ? [] : [provisionCitation(doc, parent, parent.text)]),
                ...listed.map((row) => provisionCitation(doc, row, row.summary))
              ]
            }
          },
          withDataErrors((params) => [params.documentId])
        )
      }
    })
  )
