import { Context, Duration, Effect, Exit, Layer, Option, Ref, Schedule, Scope } from "effect"
import { McpClient, McpProtocol } from "effect/ai"
import { HttpClient } from "effect/http"

import { AgentConfig } from "../config/AgentConfig.ts"
import type { ServerEntry } from "../config/ServerDirectory.ts"
import { ServerDirectory } from "../config/ServerDirectory.ts"

/** A tool from an MCP server, returning the full MCP result and returning failures to the model as results. */
export type McpTool = McpClient.RemoteTool<"complete", "return">

export type McpToolkit = Effect.Success<ReturnType<typeof McpClient.toolkit<"complete", "return">>>

/** A server's open client, as the toolkit of the tools it listed when it connected, under its prefix. */
export interface Connection {
  readonly toolkit: McpToolkit
  readonly scope: Scope.Closeable
}

/** A server from the directory and its connection, if it has one. */
export interface ServerState {
  readonly server: ServerEntry
  readonly connection: Option.Option<Connection>
}

export interface ConnectionSettings {
  /** Longest one connection attempt, and later each tool call, may take. */
  readonly callTimeout: Duration.Duration
  readonly reconnectBaseDelay: Duration.Duration
  readonly reconnectMaxDelay: Duration.Duration
}

/**
 * Opens a sessionless client to `server`, initializes it, lists its tools and builds their toolkit under the
 * server's prefix, within `callTimeout`; the connection owns its own scope.
 */
const connect = Effect.fn("McpConnections.connect")(function* (server: ServerEntry, settings: ConnectionSettings) {
  const scope = yield* Scope.make()
  return yield* Effect.gen(function* () {
    const transport = yield* McpClient.http({ url: server.url, protocol: McpProtocol.v2026_07_28 })
    const client = yield* McpClient.make({ name: "policyhuis-backend", version: "0.1.0" }).pipe(
      Effect.provideService(McpClient.Transport, transport)
    )
    const toolkit = yield* McpClient.toolkit(client, {
      prefix: server.prefix,
      tools: yield* client.listTools(),
      resultMode: "complete",
      failureMode: "return",
      timeout: settings.callTimeout
    })
    const connection: Connection = { toolkit, scope }
    return connection
  }).pipe(
    Effect.timeout(settings.callTimeout),
    Scope.provide(scope),
    Effect.onExit((exit) => (Exit.isFailure(exit) ? Scope.close(scope, exit) : Effect.void))
  )
})

/**
 * One long-lived client per server in the directory. Clients use the sessionless MCP protocol, so a server that
 * restarts is reachable again through the same client. A server that cannot be reached at startup is connected in
 * the background with exponential backoff; until then its tools are left out of requests.
 */
export const makeConnections = Effect.fn("McpConnections.make")(function* (
  servers: ReadonlyArray<ServerEntry>,
  settings: ConnectionSettings
) {
  const scope = yield* Effect.scope
  const httpClient = yield* HttpClient.HttpClient
  const backoff = Schedule.min([
    Schedule.exponential(settings.reconnectBaseDelay),
    Schedule.spaced(settings.reconnectMaxDelay)
  ])

  const states = yield* Effect.forEach(servers, (server) =>
    Effect.map(Ref.make(Option.none<Connection>()), (ref) => ({ server, ref }))
  )

  const connectInBackground = (server: ServerEntry, ref: Ref.Ref<Option.Option<Connection>>) =>
    connect(server, settings).pipe(
      Effect.tapError((error) =>
        Effect.logWarning(`MCP server ${server.name} could not be reached; retrying`, error.message)
      ),
      Effect.retry(backoff),
      Effect.flatMap((connection) => Ref.set(ref, Option.some(connection))),
      Effect.tap(() => Effect.logInfo(`MCP server ${server.name} connected`)),
      Effect.provideService(HttpClient.HttpClient, httpClient),
      Effect.forkIn(scope)
    )

  yield* Effect.forEach(
    states,
    ({ server, ref }) =>
      Effect.exit(connect(server, settings)).pipe(
        Effect.flatMap((exit) =>
          Exit.isSuccess(exit)
            ? Ref.set(ref, Option.some(exit.value))
            : Effect.logWarning(`MCP server ${server.name} could not be reached at startup`).pipe(
                Effect.andThen(connectInBackground(server, ref))
              )
        )
      ),
    { concurrency: "unbounded", discard: true }
  )

  yield* Effect.addFinalizer(() =>
    Effect.forEach(
      states,
      ({ ref }) =>
        Ref.get(ref).pipe(
          Effect.flatMap(
            Option.match({
              onNone: () => Effect.void,
              onSome: (connection) => Scope.close(connection.scope, Exit.void)
            })
          )
        ),
      { discard: true }
    )
  )

  /** Every server and its current connection, for building one request's toolkit. */
  const current: Effect.Effect<ReadonlyArray<ServerState>> = Effect.forEach(states, ({ server, ref }) =>
    Effect.map(Ref.get(ref), (connection) => ({ server, connection }))
  )

  return { current } as const
})

export class McpConnections extends Context.Service<
  McpConnections,
  { readonly current: Effect.Effect<ReadonlyArray<ServerState>> }
>()("backend/McpConnections") {
  static readonly layer: Layer.Layer<McpConnections, never, ServerDirectory | AgentConfig | HttpClient.HttpClient> =
    Layer.effect(
      this,
      Effect.gen(function* () {
        const directory = yield* ServerDirectory
        const config = yield* AgentConfig
        return yield* makeConnections(directory.servers, config.tools)
      })
    )
}
