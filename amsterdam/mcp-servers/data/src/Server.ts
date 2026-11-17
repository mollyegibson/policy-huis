import { createServer } from "node:http"

import * as NodeHttpServer from "@effect/platform-node/NodeHttpServer"
import * as NodeServices from "@effect/platform-node/NodeServices"
import { PgClient } from "@effect/sql-pg"
import { Effect, Layer } from "effect"
import { McpProtocol, McpServer } from "effect/ai"
import { HttpRouter } from "effect/http"

import { AmsDataHandlers } from "./Handlers.ts"
import { HousingRepo } from "./HousingRepo.ts"
import { DatabaseConfig, HttpConfig, AmsDataEnv } from "./AmsDataServerConfig.ts"
import { makeAmsDataToolkit } from "./Tools.ts"

/** The read-only connection to the `ams_data` schema, as the `ams_data_reader` role. */
export const DatabaseLive = Layer.unwrap(
  Effect.gen(function* () {
    const { readerUrl } = yield* DatabaseConfig
    return PgClient.layer({ url: readerUrl })
  })
)

/**
 * The tool registrations. Each tool is added to `makeAmsDataToolkit` as the data it reads is modelled; a tool that
 * reads a dataset lists the dataset keys loaded when the server starts, so a new dataset needs a restart of the
 * server, then of the backend.
 */
export const RegistrationsLive = Layer.unwrap(
  Effect.succeed(makeAmsDataToolkit()).pipe(
    Effect.map((toolkit) => McpServer.toolkit(toolkit).pipe(Layer.provide(AmsDataHandlers(toolkit))))
  )
)

/** The ams-data tools, served by `McpServer` over Streamable HTTP at `/mcp`. */
export const McpLive = McpServer.layerHttp({
  name: "ams-data",
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
const ConfigLive = Layer.mergeAll(DatabaseConfig.layer, HttpConfig.layer).pipe(Layer.provide(AmsDataEnv.layer))

export const ServerLive = HttpRouter.serve(McpLive).pipe(
  Layer.provide(HttpServerLive),
  Layer.provide(ConfigLive),
  Layer.provide(NodeServices.layer)
)
