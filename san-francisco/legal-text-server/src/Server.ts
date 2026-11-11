import { createServer } from "node:http"
import { fileURLToPath } from "node:url"

import * as NodeHttpServer from "@effect/platform-node/NodeHttpServer"
import * as NodeServices from "@effect/platform-node/NodeServices"
import { PgClient } from "@effect/sql-pg"
import { Effect, Layer, Schema } from "effect"
import { McpProtocol, McpServer } from "effect/ai"
import { FetchHttpClient, HttpRouter } from "effect/http"

import { dotEnv } from "@policyhuis/node-config"

import { SfLegalTextHandlers } from "./Handlers.ts"
import { PassageRepo } from "./PassageRepo.ts"
import { QueryEmbedder } from "./QueryEmbedder.ts"
import { SearchConfig } from "./SearchConfig.ts"
import { SfLegalTextToolkit } from "./Tools.ts"

/**
 * `san-francisco/legal-text-server/.env`: the read-only database URL, the port to serve on and, optionally,
 * `OLLAMA_URL`.
 */
const ServerEnv = dotEnv(fileURLToPath(new URL("../.env", import.meta.url)))

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

/** The read-only connection to the `policy_text_sf` schema, as the `sf_legal_text_reader` role. */
export const DatabaseLive = Layer.unwrap(
  Effect.map(ServerEnv.secret("SF_LEGAL_TEXT_READER_DATABASE_URL"), (url) => PgClient.layer({ url }))
)

/** The tool registrations, given the search settings, a database and a query embedder. */
export const RegistrationsLive = McpServer.toolkit(SfLegalTextToolkit).pipe(
  Layer.provide(SfLegalTextHandlers),
  Layer.provide(EmbeddingModelCheck),
  Layer.provide(PassageRepo.layer)
)

/** The sf-legal-text tools, served by `McpServer` over Streamable HTTP at `/mcp`. */
export const McpLive = McpServer.layerHttp({
  name: "sf-legal-text",
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

/** Node's HTTP server on `SF_LEGAL_TEXT_PORT`. */
const HttpServerLive = Layer.unwrap(
  Effect.map(ServerEnv.port("SF_LEGAL_TEXT_PORT"), (port) => NodeHttpServer.layer(createServer, { port }))
)

export const ServerLive = HttpRouter.serve(McpLive).pipe(
  Layer.provide(HttpServerLive),
  Layer.provide(ServerEnv.layer),
  Layer.provide(NodeServices.layer)
)
