import { fileURLToPath } from "node:url"

import { Context, Effect, Layer, Schema } from "effect"

import { loadYaml } from "@policyhuis/node-config"

export const SEARCH_CONFIG_FILE = fileURLToPath(new URL("../config/search.yaml", import.meta.url))

/** `san-francisco/mcp-servers/documents/config/search.yaml`. */
const SearchFile = Schema.Struct({
  embedding_api: Schema.String.pipe(
    Schema.check(Schema.isPattern(/^https:\/\/\S+[^/]$/, { message: "an https URL without a trailing slash" }))
  ),
  embedding_model: Schema.NonEmptyString,
  embedding_host: Schema.String.pipe(
    Schema.check(
      Schema.isPattern(/^[a-z0-9][a-z0-9-]*$/, { message: "an OpenRouter provider slug, such as deepinfra" })
    )
  ),
  query_instruction: Schema.NonEmptyString
})

export interface Search {
  /** OpenRouter's OpenAI-compatible API, such as `https://openrouter.ai/api/v1`. */
  readonly embeddingApi: string
  readonly embeddingModel: string
  /** The one OpenRouter host allowed to serve the model, as its provider slug. */
  readonly embeddingHost: string
  /** The model and host as the passage pipeline stores them with every vector, such as `qwen/qwen3-embedding-4b@deepinfra`. */
  readonly embeddingModelId: string
  readonly queryInstruction: string
}

/** How this server embeds queries. */
export class SearchConfig extends Context.Service<SearchConfig, Search>()("SearchConfig") {
  static readonly layer = (path: string = SEARCH_CONFIG_FILE) =>
    Layer.effect(
      this,
      Effect.map(loadYaml(SearchFile)(path), (file) => ({
        embeddingApi: file.embedding_api,
        embeddingModel: file.embedding_model,
        embeddingHost: file.embedding_host,
        embeddingModelId: `${file.embedding_model}@${file.embedding_host}`,
        queryInstruction: file.query_instruction
      }))
    )
}
