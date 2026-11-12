import * as NodeHttpServer from "@effect/platform-node/NodeHttpServer"
import { describe, expect, it } from "@effect/vitest"
import { Context, Duration, Effect, Fiber, Layer, Option, Ref, Schedule, Semaphore, Stream } from "effect"
import { LanguageModel } from "effect/ai"
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
import type { AvailableModel } from "../src/model/ModelLayer.ts"
import { Models } from "../src/model/ModelLayer.ts"
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
    default: "frontier",
    offered: ["frontier", "local"],
    configurations: {
      frontier: {
        provider: "anthropic",
        label: "Test frontier model",
        modelId: "test-claude",
        effort: "low",
        contextTokens: 100_000,
        answerTokens: 1_000,
        bytesPerToken: 4,
        maxConcurrentQuestions: 1
      },
      local: {
        provider: "openai-compat",
        label: "Test local model",
        baseUrl: "https://models.example.test/v1",
        modelId: "test-local",
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

/** Both configurations in `CONFIG`, answering from the one scripted model, each with its own permits. */
const scriptedModels = Layer.effect(
  Models,
  Effect.gen(function* () {
    const model = yield* LanguageModel.LanguageModel
    const available = yield* Effect.forEach(
      CONFIG.model.offered,
      Effect.fnUntraced(function* (key) {
        const endpoint = CONFIG.model.configurations[key]
        if (endpoint === undefined) return yield* Effect.die(`no test entry for ${key}`)
        const entry: AvailableModel = {
          key,
          endpoint,
          model,
          permits: yield* Semaphore.make(endpoint.maxConcurrentQuestions)
        }
        return entry
      })
    )
    return {
      default: available[0],
      offered: available,
      find: (key: string) => Option.fromNullishOr(available.find((entry) => entry.key === key))
    }
  })
)

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
    Layer.provideMerge(scriptedModels.pipe(Layer.provideMerge(scriptedModel(script)))),
    Layer.provideMerge(traces),
    Layer.provideMerge(NodeHttpServer.layerTest)
  )
}

const ask = (question: string, options: { readonly model?: string; readonly evaluationRunId?: string } = {}) =>
  Effect.gen(function* () {
    const client = yield* HttpApiClient.make(PolicyHuisApi)
    return yield* client.questions.ask({ payload: QuestionRequest.make({ question, ...options }) })
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
    "streams lookups, their sources, the answer and Complete, and writes the trace",
    () =>
      Effect.gen(function* () {
        const server = yield* startTestServer(0)
        const events = yield* Effect.gen(function* () {
          const result = yield* collect(yield* ask("What is the word?"))
          const [trace] = yield* waitForTraces(1)
          return { result, trace }
        }).pipe(Effect.provide(apiLayer(answerScript, [{ name: "a-data", label: "A", prefix: "a_", url: server.url }])))

        const tags = events.result.filter((event) => event._tag !== "Keepalive").map((event) => event._tag)
        expect(tags).toEqual(["LookupStarted", "LookupEnded", "Sources", "TextChunk", "Complete"])
        const start = events.result.find((event) => event._tag === "LookupStarted")
        expect(start?._tag === "LookupStarted" ? [start.source, start.title] : null).toEqual([
          { name: "a-data", label: "A" },
          "Echo a word"
        ])
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
    "sends each citation once, however many lookups return it",
    () =>
      Effect.gen(function* () {
        const server = yield* startTestServer(0)
        const twice: ReadonlyArray<ScriptedTurn> = [
          { parts: [toolCall("c1", "a_echo", { word: "hello" }), finish("tool-calls", 50, 5)] },
          { parts: [toolCall("c2", "a_echo", { word: "hello" }), finish("tool-calls", 50, 5)] },
          { parts: [...text("t", "The word is hello [test.echo@1#hello]."), finish("stop", 80, 10)] }
        ]
        const result = yield* Effect.gen(function* () {
          const events = yield* collect(yield* ask("What is the word?"))
          yield* waitForTraces(1)
          return events
        }).pipe(Effect.provide(apiLayer(twice, [{ name: "a-data", label: "A", prefix: "a_", url: server.url }])))

        expect(result.filter((event) => event._tag === "LookupEnded")).toHaveLength(2)
        const sources = result.filter((event) => event._tag === "Sources")
        expect(sources.flatMap((event) => event.citations.map((c) => c.citationId))).toEqual(["test.echo@1#hello"])
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

  it.live(
    "answers with the configuration a question names, and says which in Complete and the trace",
    () =>
      Effect.gen(function* () {
        const server = yield* startTestServer(0)
        const runId = "0f1e2d3c-4b5a-4968-8776-5a4b3c2d1e0f"
        const { complete, trace } = yield* Effect.gen(function* () {
          const events = yield* collect(yield* ask("What is the word?", { model: "local", evaluationRunId: runId }))
          const [trace] = yield* waitForTraces(1)
          return { complete: events.at(-1), trace }
        }).pipe(Effect.provide(apiLayer(answerScript, [{ name: "a-data", label: "A", prefix: "a_", url: server.url }])))

        expect(complete?._tag === "Complete" ? [complete.model, complete.usage] : null).toEqual([
          { configuration: "local", modelId: "test-local" },
          { inputTokens: 130, outputTokens: 15 }
        ])
        expect(trace === undefined ? null : [trace.modelConfig, trace.modelId, trace.evaluationRunId]).toEqual([
          "local",
          "test-local",
          runId
        ])
        yield* server.stop
      }).pipe(Effect.scoped),
    30_000
  )

  it.live(
    "turns away a configuration it does not offer with 400, naming the ones it does",
    () =>
      Effect.gen(function* () {
        const error = yield* ask("What is the word?", { model: "same_model_cloud" }).pipe(
          Effect.flip,
          Effect.provide(apiLayer(answerScript, []))
        )
        expect(error._tag === "UnknownModel" ? [error.model, error.offered] : error._tag).toEqual([
          "same_model_cloud",
          ["frontier", "local"]
        ])
      }).pipe(Effect.scoped),
    30_000
  )

  it.live(
    "admits a question for one configuration while another configuration is busy",
    () =>
      Effect.gen(function* () {
        const server = yield* startTestServer(0)
        const script: ReadonlyArray<ScriptedTurn> = [{ parts: [], stall: true }, ...answerScript]
        yield* Effect.gen(function* () {
          const reading = yield* Effect.forkChild(collect(yield* ask("first")))
          yield* Effect.sleep("200 millis")
          const busy = yield* ask("second").pipe(Effect.flip)
          expect(busy._tag).toBe("AgentUnavailable")
          const other = yield* collect(yield* ask("third", { model: "local" }))
          expect(other.at(-1)?._tag === "Complete" ? other.at(-1) : null).toMatchObject({ outcome: "answered" })
          yield* Fiber.interrupt(reading)
        }).pipe(Effect.provide(apiLayer(script, [{ name: "a-data", label: "A", prefix: "a_", url: server.url }])))
        yield* server.stop
      }).pipe(Effect.scoped),
    30_000
  )
})

describe("GET /api/v1/models", () => {
  it.live(
    "lists the offered configurations in order, with their labels, and the default",
    () =>
      Effect.gen(function* () {
        const listing = yield* Effect.gen(function* () {
          const client = yield* HttpApiClient.make(PolicyHuisApi)
          return yield* client.models.list()
        }).pipe(Effect.provide(apiLayer([], [])))
        expect(listing).toEqual({
          default: "frontier",
          models: [
            { configuration: "frontier", label: "Test frontier model", modelId: "test-claude" },
            { configuration: "local", label: "Test local model", modelId: "test-local" }
          ]
        })
      }).pipe(Effect.scoped),
    30_000
  )
})
