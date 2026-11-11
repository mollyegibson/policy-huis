import { describe, expect, it } from "@effect/vitest"
import { Duration, Effect, Option, Schedule, Stream } from "effect"
import { Prompt } from "effect/ai"
import { FetchHttpClient } from "effect/http"

import type { ServerEntry } from "../src/config/ServerDirectory.ts"
import type { LoopSettings } from "../src/loop/AgentLoop.ts"
import { runAgentLoop } from "../src/loop/AgentLoop.ts"
import { makeConnections } from "../src/tools/McpConnections.ts"
import type { TurnTools } from "../src/tools/TurnToolkit.ts"
import { turnTools } from "../src/tools/TurnToolkit.ts"
import { finish, scriptedModel, text, toolCall } from "./support/ScriptedModel.ts"
import { startTestServer } from "./support/TestMcpServer.ts"

/** Synthetic limits for these tests only; the backend's values are in config/agent.yaml. */
const SETTINGS: LoopSettings = {
  maxSteps: 3,
  stepTimeout: Duration.seconds(10),
  requestTimeout: Duration.seconds(20),
  modelRetries: 0,
  modelRetryBaseDelay: Duration.seconds(1),
  toolConcurrency: 2,
  contextTokens: 100_000,
  answerTokens: 1_000,
  bytesPerToken: 4
}

const RECONNECT = {
  callTimeout: Duration.seconds(5),
  reconnectBaseDelay: Duration.millis(50),
  reconnectMaxDelay: Duration.millis(200)
}

const entry = (name: string, prefix: string, url: string): ServerEntry => ({
  name,
  label: name.toUpperCase(),
  prefix,
  url
})

/** Asks the scripted model to call `tool` with `word`, then answer, and returns the loop's `ToolEnd`. */
const callThroughLoop = (tools: TurnTools, tool: string, word: string) =>
  runAgentLoop(Prompt.make("question"), tools.toolkit, tools.serverOf, SETTINGS).pipe(
    Stream.runCollect,
    Effect.map((events) => Array.from(events).find((event) => event._tag === "ToolEnd")),
    Effect.provide(
      scriptedModel([
        { parts: [toolCall("c1", tool, { word }), finish("tool-calls")] },
        { parts: [...text("t", "done"), finish("stop")] }
      ])
    )
  )

/** Polls `check` every 50 ms, for up to 5 seconds, until `done` holds. */
const waitUntil = <A>(check: Effect.Effect<A>, done: (a: A) => boolean) =>
  check.pipe(
    Effect.flatMap((a) => (done(a) ? Effect.succeed(a) : Effect.fail("not yet"))),
    Effect.retry({ schedule: Schedule.spaced("50 millis"), times: 100 })
  )

describe("MCP connections", () => {
  it.live(
    "offers each connected server's tools under its prefix and routes calls to the right server",
    () =>
      Effect.gen(function* () {
        const a = yield* startTestServer(0)
        const b = yield* startTestServer(0)
        const connections = yield* makeConnections(
          [entry("a-data", "a_", a.url), entry("b-data", "b_", b.url)],
          RECONNECT
        )
        const tools = turnTools(yield* connections.current)
        expect(Object.keys(tools.toolkit.tools).sort()).toEqual(["a_echo", "b_echo"])
        expect(tools.unavailable).toEqual([])
        expect(tools.serverOf("b_echo")).toEqual({ name: "b-data", label: "B-DATA", tool: "echo" })

        const end = yield* callThroughLoop(tools, "b_echo", "hello")
        expect(end?.outcome).toBe("success")
        expect(end?.result).toEqual({ word: "hello", citations: [{ citationId: "c#hello" }] })
        yield* a.stop
        yield* b.stop
      }).pipe(Effect.scoped, Effect.provide(FetchHttpClient.layer)),
    30_000
  )

  it.live(
    "passes on the server's own error type and a transport error's type, without details",
    () =>
      Effect.gen(function* () {
        const server = yield* startTestServer(0)
        const connections = yield* makeConnections([entry("a-data", "a_", server.url)], RECONNECT)
        const tools = turnTools(yield* connections.current)

        const unknown = yield* callThroughLoop(tools, "a_echo", "unknown")
        expect([unknown?.outcome, unknown?.error, unknown?.result]).toEqual(["failure", "UnknownWord", null])

        yield* server.stop
        const down = yield* callThroughLoop(tools, "a_echo", "hello")
        expect([down?.outcome, down?.error]).toEqual(["failure", "TransportError"])
      }).pipe(Effect.scoped, Effect.provide(FetchHttpClient.layer)),
    30_000
  )

  it.live(
    "leaves out a server that is down at startup, then connects it in the background",
    () =>
      Effect.gen(function* () {
        const probe = yield* startTestServer(0)
        const port = probe.port
        yield* probe.stop

        const connections = yield* makeConnections([entry("a-data", "a_", probe.url)], RECONNECT)
        const before = turnTools(yield* connections.current)
        expect(before.unavailable).toEqual(["a-data"])
        expect(Object.keys(before.toolkit.tools)).toEqual([])

        const server = yield* startTestServer(port)
        yield* waitUntil(connections.current, (states) => states.every((s) => Option.isSome(s.connection)))
        const after = turnTools(yield* connections.current)
        expect(after.unavailable).toEqual([])
        expect(Object.keys(after.toolkit.tools)).toEqual(["a_echo"])
        yield* server.stop
      }).pipe(Effect.scoped, Effect.provide(FetchHttpClient.layer)),
    30_000
  )

  it.live(
    "offers a tool name two servers share by neither, and reports it",
    () =>
      Effect.gen(function* () {
        const a = yield* startTestServer(0)
        const b = yield* startTestServer(0)
        const connections = yield* makeConnections(
          [entry("a-data", "x_", a.url), entry("b-data", "x_", b.url)],
          RECONNECT
        )
        const tools = turnTools(yield* connections.current)
        expect(Object.keys(tools.toolkit.tools)).toEqual([])
        expect(tools.serverOf("x_echo")).toBeNull()
        expect(tools.collisions).toEqual([{ tool: "x_echo", servers: ["a-data", "b-data"] }])
        yield* a.stop
        yield* b.stop
      }).pipe(Effect.scoped, Effect.provide(FetchHttpClient.layer)),
    30_000
  )

  it.live(
    "keeps working with the same client after the server restarts",
    () =>
      Effect.gen(function* () {
        const first = yield* startTestServer(0)
        const connections = yield* makeConnections([entry("a-data", "a_", first.url)], RECONNECT)
        const tools = turnTools(yield* connections.current)
        yield* first.stop
        const second = yield* startTestServer(first.port)
        const end = yield* callThroughLoop(tools, "a_echo", "again")
        expect(end?.outcome).toBe("success")
        yield* second.stop
      }).pipe(Effect.scoped, Effect.provide(FetchHttpClient.layer)),
    30_000
  )
})
