import { createServer } from "node:http"

import * as NodeHttpServer from "@effect/platform-node/NodeHttpServer"
import * as NodeServices from "@effect/platform-node/NodeServices"
import { Effect, Layer } from "effect"
import { FetchHttpClient, HttpRouter } from "effect/http"

import { Agent } from "./agent/Agent.ts"
import { QuestionsApiLive } from "./api/QuestionsHandler.ts"
import { AgentConfig } from "./config/AgentConfig.ts"
import { AppDatabaseConfig, BackendEnv, HttpConfig, ModelApiKeysConfig } from "./config/BackendConfig.ts"
import { ServerDirectory } from "./config/ServerDirectory.ts"
import { runMigrations } from "./db/Migrations.ts"
import { SystemPrompt } from "./loop/SystemPrompt.ts"
import { ModelLayer } from "./model/ModelLayer.ts"
import { McpConnections } from "./tools/McpConnections.ts"
import { TraceStore } from "./trace/TraceStore.ts"

/** Applies pending `app` migrations before anything writes a trace. */
const MigrationsLive = Layer.effectDiscard(
  Effect.gen(function* () {
    yield* runMigrations((yield* AppDatabaseConfig).url)
  })
)

const Settings = Layer.mergeAll(AgentConfig.layer(), ServerDirectory.layer())

const Services = Layer.mergeAll(
  McpConnections.layer,
  TraceStore.layer.pipe(Layer.provide(MigrationsLive)),
  SystemPrompt.layer,
  ModelLayer
)

/** Node's HTTP server on the configured port. */
const HttpServerLive = Layer.unwrap(
  Effect.gen(function* () {
    const { port } = yield* HttpConfig
    return NodeHttpServer.layer(createServer, { port })
  })
)

/** Every environment variable the backend reads, from `.env` first, read once at startup. */
const ConfigLive = Layer.mergeAll(AppDatabaseConfig.layer, HttpConfig.layer, ModelApiKeysConfig.layer).pipe(
  Layer.provide(BackendEnv.layer)
)

/** The question API over HTTP. */
export const ServerLive = HttpRouter.serve(QuestionsApiLive).pipe(
  Layer.provide(Agent.layer),
  Layer.provide(Services),
  Layer.provide(Settings),
  Layer.provide(Layer.mergeAll(NodeServices.layer, FetchHttpClient.layer)),
  Layer.provide(HttpServerLive),
  Layer.provide(ConfigLive),
  Layer.provide(NodeServices.layer)
)
