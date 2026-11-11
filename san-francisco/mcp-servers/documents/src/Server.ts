import { createServer } from "node:http"

import * as NodeHttpServer from "@effect/platform-node/NodeHttpServer"
import * as NodeServices from "@effect/platform-node/NodeServices"
import { PgClient } from "@effect/sql-pg"
import { Effect, Layer, Schema } from "effect"
import { McpProtocol, McpServer } from "effect/ai"
import { FetchHttpClient, HttpRouter } from "effect/http"

import { SfDocsHandlers } from "./Handlers.ts"
import { PassageRepo } from "./PassageRepo.ts"
import { QueryEmbedder } from "./QueryEmbedder.ts"
import { SearchConfig } from "./SearchConfig.ts"
import { DatabaseConfig, HttpConfig, OllamaConfig, SfDocsEnv } from "./SfDocsServerConfig.ts"
import { makeSfDocsToolkit } from "./Tools.ts"

/** The stored search entries were embedded with another model than the configured one, so queries would not match. */
export class EmbeddingModelMismatch extends Schema.TaggedError<EmbeddingModelMismatch>()("EmbeddingModelMismatch", {
  configured: Schema.String,
  stored: Schema.Array(Schema.String)
}) {}

/**
 * Stops the server at startup unless every stored search entry was embedded with the configured model build. A
 * corpus with no entries yet passes; its searches find nothing.
 */
export const EmbeddingModelCheck = Layer.effectDiscard(
  Effect.gen(function* () {
    const { embeddingModelId } = yield* SearchConfig
    const stored = yield* (yield* PassageRepo).storedEmbeddingModels()
    if (stored.some((model) => model !== embeddingModelId)) {
      return yield* new EmbeddingModelMismatch({ configured: embeddingModelId, stored })
    }
  })
)

/** The read-only connection to the `sf_docs` schema, as the `sf_docs_reader` role. */
export const DatabaseLive = Layer.unwrap(
  Effect.gen(function* () {
    const { readerUrl } = yield* DatabaseConfig
    return PgClient.layer({ url: readerUrl })
  })
)

/**
 * The tool registrations, given the search settings, a database and a query embedder. The tools' descriptions list the
 * documents loaded when the server starts, so a corpus change needs a restart of the server, then of the backend.
 */
export const RegistrationsLive = Layer.unwrap(
  Effect.gen(function* () {
    const toolkit = makeSfDocsToolkit(yield* (yield* PassageRepo).documents())
    return McpServer.toolkit(toolkit).pipe(Layer.provide(SfDocsHandlers(toolkit)))
  })
).pipe(Layer.provide(EmbeddingModelCheck), Layer.provide(PassageRepo.layer))

/** The sf-docs tools, served by `McpServer` over Streamable HTTP at `/mcp`. */
export const McpLive = McpServer.layerHttp({
  name: "sf-docs",
  version: "0.1.0",
  path: "/mcp",
  protocols: [McpProtocol.v2026_07_28],
  registrations: RegistrationsLive.pipe(
    Layer.provide(QueryEmbedder.ollama),
    Layer.provide(SearchConfig.layer()),
    Layer.provide(DatabaseLive),
    Layer.provide(FetchHttpClient.layer)
  )
})

/** Node's HTTP server on the configured port. */
const HttpServerLive = Layer.unwrap(
  Effect.gen(function* () {
    const { port } = yield* HttpConfig
    return NodeHttpServer.layer(createServer, { port })
  })
)

/** Every environment variable the server reads, from `.env` first, read once at startup. */
const ConfigLive = Layer.mergeAll(DatabaseConfig.layer, HttpConfig.layer, OllamaConfig.layer).pipe(
  Layer.provide(SfDocsEnv.layer)
)

export const ServerLive = HttpRouter.serve(McpLive).pipe(
  Layer.provide(HttpServerLive),
  Layer.provide(ConfigLive),
  Layer.provide(NodeServices.layer)
)
