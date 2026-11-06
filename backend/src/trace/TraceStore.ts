import { drizzle } from "drizzle-orm/node-postgres"
import { Config, Context, Effect, Layer, Redacted, Schema } from "effect"
import pg from "pg"

import { requests, toolCalls } from "../db/schema.ts"
import type { Trace } from "./Trace.ts"
import { traceErrorDetail, traceOutcome } from "./Trace.ts"

/** Everything written for one question: the request's own facts and the trace folded from its events. */
export interface TraceRecord {
  readonly requestId: string
  readonly receivedAt: Date
  readonly question: string
  readonly modelConfig: string
  readonly modelId: string
  readonly promptVersion: string
  readonly unavailableServers: ReadonlyArray<string>
  readonly latencyMs: number
  readonly trace: Trace
}

export class TraceWriteFailed extends Schema.TaggedError<TraceWriteFailed>()("TraceWriteFailed", {
  message: Schema.String
}) {}

export class TraceStore extends Context.Service<
  TraceStore,
  { readonly write: (record: TraceRecord) => Effect.Effect<void, TraceWriteFailed> }
>()("backend/TraceStore") {
  /** Writes to the `app` schema with Drizzle, over a pool on `APP_DATABASE_URL`. */
  static readonly layer = Layer.effect(
    this,
    Effect.gen(function* () {
      const url = yield* Config.Redacted("APP_DATABASE_URL")
      const pool = yield* Effect.acquireRelease(
        Effect.sync(() => new pg.Pool({ connectionString: Redacted.value(url) })),
        (opened) => Effect.promise(() => opened.end())
      )
      const db = drizzle(pool)
      return {
        write: (record: TraceRecord) =>
          Effect.tryPromise({
            try: () => db.transaction((tx) => insertTrace(tx, record)),
            catch: (cause) => new TraceWriteFailed({ message: String(cause) })
          })
      }
    })
  )
}

type Database = Pick<ReturnType<typeof drizzle>, "insert">

/**
 * Inserts the request row and one row per finished tool call. A call that never finished (its question was cancelled
 * mid-call) has no outcome or result, so it is not written.
 */
const insertTrace = async (db: Database, record: TraceRecord) => {
  const { trace } = record
  await db.insert(requests).values({
    requestId: record.requestId,
    receivedAt: record.receivedAt,
    question: record.question,
    modelConfig: record.modelConfig,
    modelId: record.modelId,
    promptVersion: record.promptVersion,
    outcome: traceOutcome(trace),
    steps: trace.steps,
    modelRetries: trace.modelRetries,
    errorDetail: traceErrorDetail(trace),
    unavailableServers: [...record.unavailableServers],
    inputTokens: trace.inputTokens,
    outputTokens: trace.outputTokens,
    latencyMs: record.latencyMs,
    answerText: trace.answerText
  })
  const finished = trace.toolCalls.flatMap((call) =>
    call.outcome === null
      ? []
      : [
          {
            requestId: record.requestId,
            callId: call.callId,
            step: call.step,
            tool: call.tool,
            arguments: call.arguments,
            outcome: call.outcome,
            result: call.result,
            latencyMs: call.startedAt !== null && call.endedAt !== null ? call.endedAt - call.startedAt : 0
          }
        ]
  )
  if (finished.length > 0) await db.insert(toolCalls).values(finished)
}
