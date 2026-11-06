import { Context, Duration, Effect, Exit, Layer, Option, Schedule, Scope, SynchronizedRef } from "effect"
import { McpClient, McpProtocol } from "effect/ai"
import type { McpSchema } from "effect/ai"
import { HttpClient } from "effect/http"

import { AgentConfig } from "../config/AgentConfig.ts"
import type { ServerEntry } from "../config/ServerDirectory.ts"
import { ServerDirectory } from "../config/ServerDirectory.ts"

/** An open client to one MCP server and the tools it listed when it connected. */
export interface Connection {
  readonly client: McpClient.McpClient
  readonly tools: ReadonlyArray<McpSchema.Tool>
  readonly scope: Scope.Closeable
}

/** A server from the directory and its connection, if it has one. */
export interface ServerState {
  readonly server: ServerEntry
  readonly connection: Option.Option<Connection>
}

export interface ReconnectSettings {
  /** Longest one connection attempt (initialize and list tools) may take. */
  readonly callTimeout: Duration.Duration
  readonly reconnectBaseDelay: Duration.Duration
  readonly reconnectMaxDelay: Duration.Duration
}

/**
 * Opens a sessionless client to `server`, initializes it and lists its tools, within `timeout`; the connection owns
 * its own scope.
 */
const connect = Effect.fn("McpConnections.connect")(function* (server: ServerEntry, timeout: Duration.Duration) {
  const scope = yield* Scope.make()
  return yield* Effect.gen(function* () {
    const transport = yield* McpClient.http({ url: server.url, protocol: McpProtocol.v2026_07_28 })
    const client = yield* McpClient.make({ name: "policyhuis-backend", version: "0.1.0" }).pipe(
      Effect.provideService(McpClient.Transport, transport)
    )
    const tools = yield* client.listTools()
    return { client, tools, scope }
  }).pipe(
    Effect.timeout(timeout),
    Scope.provide(scope),
    Effect.onExit((exit) => (Exit.isFailure(exit) ? Scope.close(scope, exit) : Effect.void))
  )
})

/**
 * One long-lived client per server in the directory. A server that cannot be reached at startup, or whose client
 * closes, is reconnected in the background with exponential backoff; until then its tools are left out of requests.
 */
export const makeConnections = Effect.fn("McpConnections.make")(function* (
  servers: ReadonlyArray<ServerEntry>,
  settings: ReconnectSettings
) {
  const scope = yield* Effect.scope
  const httpClient = yield* HttpClient.HttpClient
  const backoff = Schedule.min([
    Schedule.exponential(settings.reconnectBaseDelay),
    Schedule.spaced(settings.reconnectMaxDelay)
  ])

  const states = yield* Effect.forEach(servers, (server) =>
    Effect.map(SynchronizedRef.make(Option.none<Connection>()), (ref) => ({ server, ref }))
  )

  const reconnectInBackground = (
    server: ServerEntry,
    ref: SynchronizedRef.SynchronizedRef<Option.Option<Connection>>
  ) =>
    connect(server, settings.callTimeout).pipe(
      Effect.tapError((error) =>
        Effect.logWarning(`MCP server ${server.name} could not be reached; retrying`, error.message)
      ),
      Effect.retry(backoff),
      Effect.flatMap((connection) => SynchronizedRef.set(ref, Option.some(connection))),
      Effect.tap(() => Effect.logInfo(`MCP server ${server.name} connected`)),
      Effect.provideService(HttpClient.HttpClient, httpClient),
      Effect.forkIn(scope)
    )

  yield* Effect.forEach(
    states,
    ({ server, ref }) =>
      Effect.exit(connect(server, settings.callTimeout)).pipe(
        Effect.flatMap((exit) =>
          Exit.isSuccess(exit)
            ? SynchronizedRef.set(ref, Option.some(exit.value))
            : Effect.logWarning(`MCP server ${server.name} could not be reached at startup`).pipe(
                Effect.andThen(reconnectInBackground(server, ref))
              )
        )
      ),
    { concurrency: "unbounded", discard: true }
  )

  yield* Effect.addFinalizer(() =>
    Effect.forEach(
      states,
      ({ ref }) =>
        SynchronizedRef.get(ref).pipe(
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
    Effect.map(SynchronizedRef.get(ref), (connection) => ({ server, connection }))
  )

  /** Drops a server's closed client and reconnects in the background; does nothing while it is already reconnecting. */
  const reconnect = (name: string): Effect.Effect<void> => {
    const state = states.find((s) => s.server.name === name)
    if (state === undefined) return Effect.void
    return SynchronizedRef.updateEffect(state.ref, (connection) =>
      Option.match(connection, {
        onNone: () => Effect.succeed(connection),
        onSome: (open) =>
          Scope.close(open.scope, Exit.void).pipe(
            Effect.andThen(reconnectInBackground(state.server, state.ref)),
            Effect.as(Option.none<Connection>())
          )
      })
    )
  }

  return { current, reconnect } as const
})

export class McpConnections extends Context.Service<
  McpConnections,
  {
    readonly current: Effect.Effect<ReadonlyArray<ServerState>>
    readonly reconnect: (name: string) => Effect.Effect<void>
  }
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
