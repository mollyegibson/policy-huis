import { createServer } from "node:http"

import * as NodeHttpServer from "@effect/platform-node/NodeHttpServer"
import * as NodeServices from "@effect/platform-node/NodeServices"
import { PgClient } from "@effect/sql-pg"
import { Effect, Layer } from "effect"
import { McpProtocol, McpServer } from "effect/ai"
import { HttpRouter } from "effect/http"

import { SfDataHandlers } from "./Handlers.ts"
import { HousingRepo } from "./HousingRepo.ts"
import { DatabaseConfig, HttpConfig, SfDataEnv } from "./SfDataServerConfig.ts"
import { makeSfDataToolkit } from "./Tools.ts"

/** The read-only connection to the `sf_data` schema, as the `sf_data_reader` role. */
export const DatabaseLive = Layer.unwrap(
  Effect.gen(function* () {
    const { readerUrl } = yield* DatabaseConfig
    return PgClient.layer({ url: readerUrl })
  })
)

/**
 * The tool registrations, given the housing repository. `dataset_info` offers the dataset keys loaded when the server
 * starts, so a new dataset needs a restart of the server, then of the backend. If they cannot be read, the server
 * still starts, with `dataset` taking any text, and every tool reports the database error when called.
 */
export const RegistrationsLive = Layer.unwrap(
  Effect.gen(function* () {
    const datasetKeys = yield* (yield* HousingRepo).datasets().pipe(
      Effect.map((datasets) => datasets.map((d) => d.datasetKey)),
      Effect.catch((error) =>
        Effect.as(
          Effect.logWarning("The loaded datasets could not be read; dataset_info will take any dataset key", error),
          []
        )
      )
    )
    const toolkit = makeSfDataToolkit(datasetKeys)
    return McpServer.toolkit(toolkit).pipe(Layer.provide(SfDataHandlers(toolkit)))
  })
)

/** The sf-data tools, served by `McpServer` over Streamable HTTP at `/mcp`. */
export const McpLive = McpServer.layerHttp({
  name: "sf-data",
  version: "0.1.0",
  path: "/mcp",
  protocols: [McpProtocol.v2026_07_28],
  registrations: RegistrationsLive.pipe(Layer.provide(HousingRepo.layer), Layer.provide(DatabaseLive))
})

/** Node's HTTP server on the configured port. */
const HttpServerLive = Layer.unwrap(
  Effect.gen(function* () {
    const { port } = yield* HttpConfig
    return NodeHttpServer.layer(createServer, { port })
  })
)

/** Every environment variable the server reads, from `.env` first, read once at startup. */
const ConfigLive = Layer.mergeAll(DatabaseConfig.layer, HttpConfig.layer).pipe(Layer.provide(SfDataEnv.layer))

export const ServerLive = HttpRouter.serve(McpLive).pipe(
  Layer.provide(HttpServerLive),
  Layer.provide(ConfigLive),
  Layer.provide(NodeServices.layer)
)
