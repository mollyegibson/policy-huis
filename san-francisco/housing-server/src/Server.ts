import { createServer } from "node:http"
import { fileURLToPath } from "node:url"

import * as NodeHttpServer from "@effect/platform-node/NodeHttpServer"
import * as NodeServices from "@effect/platform-node/NodeServices"
import { PgClient } from "@effect/sql-pg"
import { Config, ConfigProvider, Effect, Layer, Option } from "effect"
import { McpProtocol, McpServer } from "effect/ai"
import { HttpRouter } from "effect/http"

import { SfHousingHandlers } from "./Handlers.ts"
import { HousingRepo } from "./HousingRepo.ts"
import { SfHousingToolkit } from "./Tools.ts"

const ENV_FILE = fileURLToPath(new URL("../.env", import.meta.url))

/** Configuration from this server's `.env`, which takes priority over the shell, then from the environment. */
export const ConfigLive = ConfigProvider.layer(
  Effect.gen(function* () {
    const env = ConfigProvider.fromEnv()
    const dotEnv = yield* ConfigProvider.fromDotEnv({ path: ENV_FILE }).pipe(Effect.option)
    return Option.match(dotEnv, { onNone: () => env, onSome: (file) => file.pipe(ConfigProvider.orElse(env)) })
  })
).pipe(Layer.provide(NodeServices.layer))

/** The read-only connection to the `sf` schema, as the `sf_housing_reader` role. */
export const DatabaseLive = PgClient.layerConfig({ url: Config.Redacted("SF_HOUSING_READER_DATABASE_URL") })

/** The sf-housing tools, served by `McpServer` over Streamable HTTP at `/mcp`. */
export const McpLive = McpServer.layerHttp({
  name: "sf-housing",
  version: "0.1.0",
  path: "/mcp",
  protocols: [McpProtocol.v2025_11_25],
  registrations: McpServer.toolkit(SfHousingToolkit).pipe(
    Layer.provide(SfHousingHandlers),
    Layer.provide(HousingRepo.layer),
    Layer.provide(DatabaseLive)
  )
})

export const ServerLive = HttpRouter.serve(McpLive).pipe(
  Layer.provide(NodeHttpServer.layerConfig(createServer, { port: Config.Port("SF_HOUSING_PORT") })),
  Layer.provide(ConfigLive)
)
