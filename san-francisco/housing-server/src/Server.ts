import { createServer } from "node:http"
import { fileURLToPath } from "node:url"

import * as NodeHttpServer from "@effect/platform-node/NodeHttpServer"
import * as NodeServices from "@effect/platform-node/NodeServices"
import { PgClient } from "@effect/sql-pg"
import { Effect, Layer } from "effect"
import { McpProtocol, McpServer } from "effect/ai"
import { HttpRouter } from "effect/http"

import { dotEnv } from "@policyhuis/node-config"

import { SfHousingHandlers } from "./Handlers.ts"
import { HousingRepo } from "./HousingRepo.ts"
import { SfHousingToolkit } from "./Tools.ts"

/** `san-francisco/housing-server/.env`: the read-only database URL and the port to serve on. */
const ServerEnv = dotEnv(fileURLToPath(new URL("../.env", import.meta.url)))

/** The read-only connection to the `sf` schema, as the `sf_housing_reader` role. */
export const DatabaseLive = Layer.unwrap(
  Effect.map(ServerEnv.secret("SF_HOUSING_READER_DATABASE_URL"), (url) => PgClient.layer({ url }))
)

/** The sf-housing tools, served by `McpServer` over Streamable HTTP at `/mcp`. */
export const McpLive = McpServer.layerHttp({
  name: "sf-housing",
  version: "0.1.0",
  path: "/mcp",
  protocols: [McpProtocol.v2026_07_28],
  registrations: McpServer.toolkit(SfHousingToolkit).pipe(
    Layer.provide(SfHousingHandlers),
    Layer.provide(HousingRepo.layer),
    Layer.provide(DatabaseLive)
  )
})

/** Node's HTTP server on `SF_HOUSING_PORT`. */
const HttpServerLive = Layer.unwrap(
  Effect.map(ServerEnv.port("SF_HOUSING_PORT"), (port) => NodeHttpServer.layer(createServer, { port }))
)

export const ServerLive = HttpRouter.serve(McpLive).pipe(
  Layer.provide(HttpServerLive),
  Layer.provide(ServerEnv.layer),
  Layer.provide(NodeServices.layer)
)
