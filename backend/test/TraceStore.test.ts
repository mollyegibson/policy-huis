import { describe, expect, layer } from "@effect/vitest"
import { PostgreSqlContainer } from "@testcontainers/postgresql"
import { Context, Duration, Effect, Layer, Redacted } from "effect"
import pg from "pg"

import type { AgentConfigFile } from "../src/config/AgentConfig.ts"
import { AgentConfig } from "../src/config/AgentConfig.ts"
import { AppDatabaseConfig } from "../src/config/BackendConfig.ts"
import { runMigrations } from "../src/db/Migrations.ts"
import type { Trace } from "../src/trace/Trace.ts"
import { emptyTrace } from "../src/trace/Trace.ts"
import type { TraceRecord } from "../src/trace/TraceStore.ts"
import { TraceStore } from "../src/trace/TraceStore.ts"

const POSTGRES_IMAGE = "postgres:17"

/** A throwaway Postgres, as its connection URL. */
class Database extends Context.Service<Database, string>()("test/Database") {
  static readonly layer = Layer.effect(
    this,
    Effect.acquireRelease(
      Effect.tryPromise(() => new PostgreSqlContainer(POSTGRES_IMAGE).start()),
      (started) => Effect.promise(() => started.stop())
    ).pipe(Effect.map((started) => started.getConnectionUri()))
  )
}

const query = (url: string, text: string) =>
  Effect.acquireUseRelease(
    Effect.sync(() => new pg.Client({ connectionString: url })),
    (client) =>
      Effect.tryPromise(async (): Promise<ReadonlyArray<unknown>> => {
        await client.connect()
        const result = await client.query<Record<string, unknown>>(text)
        return result.rows
      }),
    (client) => Effect.promise(() => client.end())
  )

/** Synthetic settings; the trace store reads only `trace.writeTimeout`. */
const CONFIG: AgentConfigFile = {
  model: {
    default: "local",
    offered: ["local"],
    configurations: {
      local: {
        provider: "openai-compat",
        label: "Test model",
        baseUrl: "http://localhost:1/v1",
        modelId: "test-model",
        contextTokens: 1_000,
        answerTokens: 100,
        bytesPerToken: 4,
        maxConcurrentQuestions: 1
      }
    }
  },
  loop: {
    maxSteps: 1,
    stepTimeout: Duration.seconds(1),
    requestTimeout: Duration.seconds(1),
    modelRetries: 0,
    modelRetryBaseDelay: Duration.millis(10),
    toolConcurrency: 1
  },
  tools: {
    callTimeout: Duration.seconds(1),
    reconnectBaseDelay: Duration.millis(10),
    reconnectMaxDelay: Duration.millis(10)
  },
  api: { keepaliveInterval: Duration.seconds(1) },
  trace: { writeTimeout: Duration.seconds(5) },
  prompt: { file: "unused", version: "test" }
}

/** Writes `record` with a trace store on `url`. */
const write = (url: string, written: TraceRecord) =>
  Effect.gen(function* () {
    const store = yield* TraceStore
    return yield* store.write(written)
  }).pipe(Effect.provide(storeFor(url)))

const storeFor = (url: string) =>
  TraceStore.layer.pipe(
    Layer.provide(Layer.succeed(AgentConfig, CONFIG)),
    Layer.provide(Layer.succeed(AppDatabaseConfig, { url: Redacted.make(url) }))
  )

const call = (callId: string, step: number) => ({
  callId,
  providerCallId: "call_0",
  step,
  tool: "sf_lookup",
  arguments: { key: String(step) },
  outcome: "success" as const,
  result: { value: String(step) },
  startedAt: 1_000,
  endedAt: 1_200
})

const record = (requestId: string, trace: Trace): TraceRecord => ({
  requestId,
  receivedAt: new Date("2026-11-05T12:00:00Z"),
  question: "What is the word?",
  modelConfig: "local",
  modelId: "test-model",
  modelSettings: { reasoning_effort: "low" },
  evaluationRunId: null,
  promptVersion: "test",
  unavailableServers: [],
  latencyMs: 500,
  trace
})

layer(Database.layer, { timeout: 120_000 })("app schema", (it) => {
  it.effect("writes calls whose provider reused a call ID across steps", () =>
    Effect.gen(function* () {
      const url = yield* Database
      yield* runMigrations(Redacted.make(url))
      const requestId = "9a1b2c3d-4e5f-4a6b-8c7d-0e1f2a3b4c5d"
      yield* write(
        url,
        record(requestId, {
          ...emptyTrace,
          steps: 2,
          outcome: "answered",
          toolCalls: [call("11111111-1111-4111-8111-111111111111", 0), call("22222222-2222-4222-8222-222222222222", 1)]
        })
      )
      const rows = yield* query(
        url,
        `SELECT call_id::text AS call_id, provider_call_id, step FROM app.tool_calls
         WHERE request_id = '${requestId}' ORDER BY step`
      )
      expect(rows).toEqual([
        { call_id: "11111111-1111-4111-8111-111111111111", provider_call_id: "call_0", step: 0 },
        { call_id: "22222222-2222-4222-8222-222222222222", provider_call_id: "call_0", step: 1 }
      ])
    })
  )

  it.effect("records the model's settings and the evaluation run", () =>
    Effect.gen(function* () {
      const url = yield* Database
      yield* runMigrations(Redacted.make(url))
      const requestId = "5d6e7f80-9a1b-4c2d-8e3f-4a5b6c7d8e9f"
      const runId = "0f1e2d3c-4b5a-4968-8776-5a4b3c2d1e0f"
      yield* write(url, { ...record(requestId, { ...emptyTrace, outcome: "answered" }), evaluationRunId: runId })
      const rows = yield* query(
        url,
        `SELECT model_settings, evaluation_run_id::text AS evaluation_run_id FROM app.requests
         WHERE request_id = '${requestId}'`
      )
      expect(rows).toEqual([{ model_settings: { reasoning_effort: "low" }, evaluation_run_id: runId }])
    })
  )
})

describe("TraceStore without its database", () => {
  layer(Layer.empty)((it) => {
    it.effect("fails the write with TraceWriteFailed instead of waiting", () =>
      Effect.gen(function* () {
        const error = yield* Effect.flip(
          write("postgresql://u:p@127.0.0.1:1/db", record("3c4d5e6f-7a8b-4c9d-8e0f-1a2b3c4d5e6f", emptyTrace))
        )
        expect(error._tag).toBe("TraceWriteFailed")
      })
    )
  })
})
