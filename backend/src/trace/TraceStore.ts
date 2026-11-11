import { drizzle } from "drizzle-orm/node-postgres"
import { Context, Duration, Effect, Layer, Redacted, Schema } from "effect"
import pg from "pg"

import { AgentConfig } from "../config/AgentConfig.ts"
import { AppDatabaseConfig } from "../config/BackendConfig.ts"
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
  /**
   * Writes to the `app` schema with Drizzle, over a pool on the `app` database (`AppDatabaseConfig`). A write that has not finished within
   * `trace.writeTimeout` fails, and the pool gives up connecting or querying after the same time, so an unreachable
   * database cannot hold a write open.
   */
  static readonly layer = Layer.effect(
    this,
    Effect.gen(function* () {
      const config = yield* AgentConfig
      const { url } = yield* AppDatabaseConfig
      const timeout = config.trace.writeTimeout
      const timeoutMillis = Duration.toMillis(timeout)
      const pool = yield* Effect.acquireRelease(
        Effect.sync(
          () =>
            new pg.Pool({
              connectionString: Redacted.value(url),
              connectionTimeoutMillis: timeoutMillis,
              query_timeout: timeoutMillis
            })
        ),
        (opened) => Effect.promise(() => opened.end())
      )
      const db = drizzle(pool)
      return {
        write: (record: TraceRecord) =>
          Effect.tryPromise({
            try: () => db.transaction((tx) => insertTrace(tx, record)),
            catch: (cause) => new TraceWriteFailed({ message: String(cause) })
          }).pipe(
            Effect.timeoutOrElse({
              duration: timeout,
              orElse: () =>
                Effect.fail(
                  new TraceWriteFailed({ message: `not written within ${String(Duration.toSeconds(timeout))} seconds` })
                )
            })
          )
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
            providerCallId: call.providerCallId,
            step: call.step,
            tool: call.tool,
            arguments: call.arguments,
            outcome: call.outcome,
            result: call.result,
            latencyMs: call.endedAt === null ? null : call.endedAt - call.startedAt
          }
        ]
  )
  if (finished.length > 0) await db.insert(toolCalls).values(finished)
}
