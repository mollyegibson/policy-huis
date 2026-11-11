import * as NodeHttpServer from "@effect/platform-node/NodeHttpServer"
import { describe, expect, it } from "@effect/vitest"
import { Context, Duration, Effect, Fiber, Layer, Ref, Schedule, Stream } from "effect"
import { FetchHttpClient, HttpRouter } from "effect/http"
import { HttpApiClient } from "effect/http-api"

import type { AgentStreamEvent } from "@policyhuis/protocol/QuestionsApi"
import { PolicyHuisApi, QuestionRequest } from "@policyhuis/protocol/QuestionsApi"

import { Agent } from "../src/agent/Agent.ts"
import { QuestionsApiLive } from "../src/api/QuestionsHandler.ts"
import type { AgentConfigFile } from "../src/config/AgentConfig.ts"
import { AgentConfig } from "../src/config/AgentConfig.ts"
import type { ServerEntry } from "../src/config/ServerDirectory.ts"
import { SystemPrompt } from "../src/loop/SystemPrompt.ts"
import { McpConnections, makeConnections } from "../src/tools/McpConnections.ts"
import type { TraceRecord } from "../src/trace/TraceStore.ts"
import { TraceStore } from "../src/trace/TraceStore.ts"
import { traceOutcome } from "../src/trace/Trace.ts"
import type { ScriptedTurn } from "./support/ScriptedModel.ts"
import { finish, ModelCalls, scriptedModel, text, toolCall } from "./support/ScriptedModel.ts"
import { startTestServer } from "./support/TestMcpServer.ts"

/** Synthetic settings for these tests only; the backend's values are in config/agent.yaml. */
const CONFIG: AgentConfigFile = {
  model: {
    configuration: "frontier",
    configurations: {
      frontier: {
        baseUrl: "https://models.example.test/v1",
        modelId: "test-model",
        contextTokens: 100_000,
        answerTokens: 1_000,
        bytesPerToken: 4,
        maxConcurrentQuestions: 1
      }
    }
  },
  loop: {
    maxSteps: 3,
    stepTimeout: Duration.seconds(2),
    requestTimeout: Duration.seconds(10),
    modelRetries: 0,
    modelRetryBaseDelay: Duration.millis(10),
    toolConcurrency: 2
  },
  tools: {
    callTimeout: Duration.seconds(5),
    reconnectBaseDelay: Duration.millis(50),
    reconnectMaxDelay: Duration.millis(200)
  },
  trace: {
    writeTimeout: Duration.seconds(5)
  },
  api: { keepaliveInterval: Duration.millis(300) },
  prompt: { file: "unused", version: "test" }
}

class Traces extends Context.Service<Traces, Ref.Ref<ReadonlyArray<TraceRecord>>>()("test/Traces") {}

/**
 * The question API on a local port with a scripted model, test MCP servers and an in-memory trace store; with
 * `hangingTraceWrites`, every trace write never finishes.
 */
const apiLayer = (
  script: ReadonlyArray<ScriptedTurn>,
  servers: ReadonlyArray<ServerEntry>,
  options: { readonly hangingTraceWrites?: boolean } = {}
) => {
  const traces = Layer.effect(Traces, Ref.make<ReadonlyArray<TraceRecord>>([]))
  const store = Layer.effect(
    TraceStore,
    Effect.gen(function* () {
      const ref = yield* Traces
      return {
        write: (record: TraceRecord) =>
          options.hangingTraceWrites === true ? Effect.never : Ref.update(ref, (all) => [...all, record])
      }
    })
  )
  const connections = Layer.effect(McpConnections, makeConnections(servers, CONFIG.tools)).pipe(
    Layer.provide(FetchHttpClient.layer)
  )
  return HttpRouter.serve(QuestionsApiLive, { disableListenLog: true, disableLogger: true }).pipe(
    Layer.provide(Agent.layer),
    Layer.provide(
      Layer.mergeAll(
        store,
        connections,
        Layer.succeed(AgentConfig, CONFIG),
        Layer.succeed(SystemPrompt, { text: "You answer housing questions.", version: "test" })
      )
    ),
    Layer.provideMerge(scriptedModel(script)),
    Layer.provideMerge(traces),
    Layer.provideMerge(NodeHttpServer.layerTest)
  )
}

const ask = (question: string) =>
  Effect.gen(function* () {
    const client = yield* HttpApiClient.make(PolicyHuisApi)
    return yield* client.questions.ask({ payload: QuestionRequest.make({ question }) })
  })

const collect = (stream: Stream.Stream<AgentStreamEvent, unknown>) =>
  Stream.runCollect(stream).pipe(Effect.map((events) => Array.from(events)))

const answerScript: ReadonlyArray<ScriptedTurn> = [
  { parts: [toolCall("c1", "a_echo", { word: "hello" }), finish("tool-calls", 50, 5)] },
  { parts: [...text("t", "The word is hello [c#hello]."), finish("stop", 80, 10)] }
]

const waitForTraces = (count: number) =>
  Effect.gen(function* () {
    const ref = yield* Traces
    return yield* Ref.get(ref).pipe(
      Effect.flatMap((all) => (all.length >= count ? Effect.succeed(all) : Effect.fail("not yet"))),
      Effect.retry({ schedule: Schedule.spaced("20 millis"), times: 100 })
    )
  })

describe("POST /api/v1/questions", () => {
  it.live(
    "streams tool calls, the answer and Complete, and writes the trace",
    () =>
      Effect.gen(function* () {
        const server = yield* startTestServer(0)
        const events = yield* Effect.gen(function* () {
          const result = yield* collect(yield* ask("What is the word?"))
          const [trace] = yield* waitForTraces(1)
          return { result, trace }
        }).pipe(Effect.provide(apiLayer(answerScript, [{ name: "a-data", label: "A", prefix: "a_", url: server.url }])))

        const tags = events.result.filter((event) => event._tag !== "Keepalive").map((event) => event._tag)
        expect(tags).toEqual(["ToolStart", "ToolEnd", "TextChunk", "Complete"])
        const start = events.result.find((event) => event._tag === "ToolStart")
        expect(start?._tag === "ToolStart" ? start.server : null).toEqual({ name: "a-data", label: "A", tool: "echo" })
        const complete = events.result.at(-1)
        expect(complete?._tag === "Complete" ? [complete.outcome, complete.message] : null).toEqual(["answered", null])
        if (events.trace === undefined) return yield* Effect.die("expected a trace")
        expect(traceOutcome(events.trace.trace)).toBe("answered")
        expect(events.trace.trace.toolCalls.map((call) => [call.tool, call.outcome])).toEqual([["a_echo", "success"]])
        yield* server.stop
      }).pipe(Effect.scoped),
    30_000
  )

  it.live(
    "turns away a second question with 503 while one is streaming, and frees the slot when the browser disconnects",
    () =>
      Effect.gen(function* () {
        const server = yield* startTestServer(0)
        const script: ReadonlyArray<ScriptedTurn> = [{ parts: [], stall: true }, ...answerScript]
        yield* Effect.gen(function* () {
          const first = yield* ask("first")
          const reading = yield* Effect.forkChild(collect(first))
          yield* Effect.sleep("200 millis")

          const busy = yield* ask("second").pipe(Effect.flip)
          expect(busy._tag === "AgentUnavailable" ? [busy.reason, busy.message] : busy._tag).toEqual([
            "busy",
            "Another question is being answered. Try again when it finishes."
          ])

          yield* Fiber.interrupt(reading)
          const [cancelled] = yield* waitForTraces(1)
          if (cancelled === undefined) return yield* Effect.die("expected a trace")
          expect(traceOutcome(cancelled.trace)).toBe("cancelled")

          const third = yield* collect(yield* ask("third"))
          expect(third.at(-1)?._tag).toBe("Complete")
        }).pipe(Effect.provide(apiLayer(script, [{ name: "a-data", label: "A", prefix: "a_", url: server.url }])))
        yield* server.stop
      }).pipe(Effect.scoped),
    30_000
  )

  it.live(
    "admits the next question while the previous question's trace is still being written",
    () =>
      Effect.gen(function* () {
        const server = yield* startTestServer(0)
        const outcomes = yield* Effect.gen(function* () {
          const first = yield* collect(yield* ask("What is the word?"))
          const second = yield* collect(yield* ask("What is the word again?"))
          return [first.at(-1), second.at(-1)].map((event) => (event?._tag === "Complete" ? event.outcome : null))
        }).pipe(
          Effect.provide(
            apiLayer(
              [...answerScript, ...answerScript],
              [{ name: "a-data", label: "A", prefix: "a_", url: server.url }],
              {
                hangingTraceWrites: true
              }
            )
          )
        )
        expect(outcomes).toEqual(["answered", "answered"])
        yield* server.stop
      }).pipe(Effect.scoped),
    30_000
  )

  it.live(
    "sends keepalives while a step stalls, then Complete with the step-timeout message",
    () =>
      Effect.gen(function* () {
        const server = yield* startTestServer(0)
        const events = yield* Effect.gen(function* () {
          return yield* collect(yield* ask("slow"))
        }).pipe(
          Effect.provide(
            apiLayer([{ parts: [], stall: true }], [{ name: "a-data", label: "A", prefix: "a_", url: server.url }])
          )
        )
        expect(events.some((event) => event._tag === "Keepalive")).toBe(true)
        const complete = events.at(-1)
        expect(complete?._tag === "Complete" ? [complete.outcome, complete.message] : null).toEqual([
          "failed",
          "One step took longer than 2 seconds, so the answer was stopped and is incomplete. Try a narrower question."
        ])
        yield* server.stop
      }).pipe(Effect.scoped),
    30_000
  )

  it.live(
    "answers without a server that is down, names it to the model, and reports it in Complete",
    () =>
      Effect.gen(function* () {
        const up = yield* startTestServer(0)
        const down = yield* startTestServer(0)
        yield* down.stop
        const servers: ReadonlyArray<ServerEntry> = [
          { name: "a-data", label: "A", prefix: "a_", url: up.url },
          { name: "b-data", label: "B", prefix: "b_", url: down.url }
        ]
        const { events, calls } = yield* Effect.gen(function* () {
          const events = yield* collect(yield* ask("What is the word?"))
          return { events, calls: yield* Ref.get(yield* ModelCalls) }
        }).pipe(Effect.provide(apiLayer(answerScript, servers)))

        const complete = events.at(-1)
        expect(complete?._tag === "Complete" ? [complete.outcome, complete.unavailableServers] : null).toEqual([
          "answered",
          ["b-data"]
        ])
        expect(JSON.stringify(calls[0]?.prompt.content)).toContain(
          "These data servers are unreachable for this question: b-data."
        )
        yield* up.stop
      }).pipe(Effect.scoped),
    30_000
  )
})
