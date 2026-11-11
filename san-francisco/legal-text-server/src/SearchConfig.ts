import { fileURLToPath } from "node:url"

import { Context, Effect, Layer, Schema } from "effect"

import { loadYaml } from "@policyhuis/node-config"

export const SEARCH_CONFIG_FILE = fileURLToPath(new URL("../config/search.yaml", import.meta.url))

const PositiveInt = Schema.Int.pipe(Schema.check(Schema.isGreaterThan(0, { message: "must be a positive integer" })))

/** `san-francisco/legal-text-server/config/search.yaml`. */
const SearchFile = Schema.Struct({
  embedding_model: Schema.NonEmptyString,
  embedding_build: Schema.String.pipe(
    Schema.check(Schema.isPattern(/^[0-9a-f]{12}$/, { message: "the first 12 hex characters of the model digest" }))
  ),
  num_ctx: PositiveInt,
  query_instruction: Schema.NonEmptyString,
  subtree_chars: PositiveInt
})

export interface Search {
  readonly embeddingModel: string
  readonly embeddingBuild: string
  /** The model and build as the passage pipeline stores them with every vector, such as `qwen3-embedding:4b@df5bd2e3c74c`. */
  readonly embeddingModelId: string
  readonly numCtx: number
  readonly queryInstruction: string
  readonly subtreeChars: number
}

/** How this server embeds queries, and the size above which `get_provision` returns an outline. */
export class SearchConfig extends Context.Service<SearchConfig, Search>()("SearchConfig") {
  static readonly layer = (path: string = SEARCH_CONFIG_FILE) =>
    Layer.effect(
      this,
      Effect.map(loadYaml(SearchFile)(path), (file) => ({
        embeddingModel: file.embedding_model,
        embeddingBuild: file.embedding_build,
        embeddingModelId: `${file.embedding_model}@${file.embedding_build}`,
        numCtx: file.num_ctx,
        queryInstruction: file.query_instruction,
        subtreeChars: file.subtree_chars
      }))
    )
}
