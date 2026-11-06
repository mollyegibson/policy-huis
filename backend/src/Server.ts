import { createServer } from "node:http"

import * as NodeHttpServer from "@effect/platform-node/NodeHttpServer"
import * as NodeServices from "@effect/platform-node/NodeServices"
import { Effect, Layer } from "effect"
import { FetchHttpClient, HttpRouter } from "effect/http"

import { Agent } from "./agent/Agent.ts"
import { QuestionsApiLive } from "./api/QuestionsHandler.ts"
import { AgentConfig } from "./config/AgentConfig.ts"
import { BackendEnv } from "./config/Env.ts"
import { ServerDirectory } from "./config/ServerDirectory.ts"
import { runMigrations } from "./db/Migrations.ts"
import { SystemPrompt } from "./loop/SystemPrompt.ts"
import { ModelLayer } from "./model/ModelLayer.ts"
import { McpConnections } from "./tools/McpConnections.ts"
import { TraceStore } from "./trace/TraceStore.ts"

/** Applies pending `app` migrations before anything writes a trace. */
const MigrationsLive = Layer.effectDiscard(
  Effect.gen(function* () {
    yield* runMigrations(yield* BackendEnv.secret("APP_DATABASE_URL"))
  })
)

const Settings = Layer.mergeAll(AgentConfig.layer(), ServerDirectory.layer())

const Services = Layer.mergeAll(
  McpConnections.layer,
  TraceStore.layer.pipe(Layer.provide(MigrationsLive)),
  SystemPrompt.layer,
  ModelLayer
)

/** Node's HTTP server on `BACKEND_PORT`. */
const HttpServerLive = Layer.unwrap(
  Effect.map(BackendEnv.port("BACKEND_PORT"), (port) => NodeHttpServer.layer(createServer, { port }))
)

/** The question API over HTTP. */
export const ServerLive = HttpRouter.serve(QuestionsApiLive).pipe(
  Layer.provide(Agent.layer),
  Layer.provide(Services),
  Layer.provide(Settings),
  Layer.provide(Layer.mergeAll(NodeServices.layer, FetchHttpClient.layer)),
  Layer.provide(HttpServerLive),
  Layer.provide(BackendEnv.layer),
  Layer.provide(NodeServices.layer)
)
