import { createServer } from "node:http"
import { fileURLToPath } from "node:url"

import * as NodeHttpServer from "@effect/platform-node/NodeHttpServer"
import * as NodeServices from "@effect/platform-node/NodeServices"
import { Config, ConfigProvider, Effect, Layer, Option } from "effect"
import { FetchHttpClient, HttpRouter } from "effect/http"

import { QuestionsApiLive } from "./api/QuestionsHandler.ts"
import { AgentConfig } from "./config/AgentConfig.ts"
import { ServerDirectory } from "./config/ServerDirectory.ts"
import { runMigrations } from "./db/Migrations.ts"
import { SystemPrompt } from "./loop/SystemPrompt.ts"
import { ModelLayer } from "./model/ModelLayer.ts"
import { McpConnections } from "./tools/McpConnections.ts"
import { TraceStore } from "./trace/TraceStore.ts"

const BACKEND_DIR = fileURLToPath(new URL("..", import.meta.url))
const ENV_FILE = fileURLToPath(new URL("../.env", import.meta.url))

/** Configuration from the backend's `.env`, which takes priority over the shell, then from the environment. */
export const ConfigLive = ConfigProvider.layer(
  Effect.gen(function* () {
    const env = ConfigProvider.fromEnv()
    const dotEnv = yield* ConfigProvider.fromDotEnv({ path: ENV_FILE }).pipe(Effect.option)
    return Option.match(dotEnv, { onNone: () => env, onSome: (file) => file.pipe(ConfigProvider.orElse(env)) })
  })
).pipe(Layer.provide(NodeServices.layer))

/** Applies pending `app` migrations before anything writes a trace. */
const MigrationsLive = Layer.effectDiscard(
  Effect.gen(function* () {
    yield* runMigrations(yield* Config.Redacted("APP_DATABASE_URL"))
  })
)

const Settings = Layer.mergeAll(AgentConfig.layer(), ServerDirectory.layer()).pipe(Layer.provide(NodeServices.layer))

const Services = Layer.mergeAll(
  McpConnections.layer,
  TraceStore.layer.pipe(Layer.provide(MigrationsLive)),
  SystemPrompt.layer(BACKEND_DIR),
  ModelLayer
).pipe(Layer.provide(Settings), Layer.provide(FetchHttpClient.layer), Layer.provide(NodeServices.layer))

/** The question API over HTTP on `BACKEND_PORT`. */
export const ServerLive = HttpRouter.serve(QuestionsApiLive).pipe(
  Layer.provide(Services),
  Layer.provide(Settings),
  Layer.provide(NodeHttpServer.layerConfig(createServer, { port: Config.Port("BACKEND_PORT") })),
  Layer.provide(ConfigLive)
)
