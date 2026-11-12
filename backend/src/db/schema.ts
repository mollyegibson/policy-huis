import { sql } from "drizzle-orm"
import { check, integer, jsonb, pgSchema, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core"

import { TOOL_OUTCOMES } from "../loop/Outcome.ts"
import { TRACE_OUTCOMES } from "../trace/Trace.ts"

/** A `CHECK … IN (…)` list; the values are the domain's own literals, never user input. */
const inList = (values: ReadonlyArray<string>) => sql.raw(values.map((value) => `'${value}'`).join(", "))

/** The backend's own schema: one row per question in `requests`, one per tool call in `tool_calls`. */
export const app = pgSchema("app")

export const requests = app.table(
  "requests",
  {
    requestId: uuid("request_id").primaryKey(),
    receivedAt: timestamp("received_at", { withTimezone: true }).notNull(),
    question: text("question").notNull(),
    /** The model configuration's key in `config/agent.yaml`. */
    modelConfig: text("model_config").notNull(),
    modelId: text("model_id").notNull(),
    /** The configuration's settings beyond its model ID, such as its effort; empty for a configuration with none. */
    modelSettings: jsonb("model_settings").notNull().default({}),
    /** The evaluation run the question was asked in; null for a question from a user. */
    evaluationRunId: uuid("evaluation_run_id"),
    promptVersion: text("prompt_version").notNull(),
    outcome: text("outcome").notNull(),
    steps: integer("steps").notNull(),
    modelRetries: integer("model_retries").notNull(),
    /** The raw error when the outcome is failed; never sent to the browser. */
    errorDetail: text("error_detail"),
    unavailableServers: text("unavailable_servers").array().notNull(),
    inputTokens: integer("input_tokens").notNull(),
    outputTokens: integer("output_tokens").notNull(),
    latencyMs: integer("latency_ms").notNull(),
    answerText: text("answer_text").notNull()
  },
  (table) => [check("requests_outcome_check", sql`${table.outcome} IN (${inList(TRACE_OUTCOMES)})`)]
)

export const toolCalls = app.table(
  "tool_calls",
  {
    requestId: uuid("request_id")
      .notNull()
      .references(() => requests.requestId),
    /** The UUID the backend gave the call. */
    callId: uuid("call_id").notNull(),
    /** The ID the model's provider gave the call, which the provider need not keep unique. */
    providerCallId: text("provider_call_id").notNull(),
    step: integer("step").notNull(),
    tool: text("tool").notNull(),
    arguments: jsonb("arguments").notNull(),
    outcome: text("outcome").notNull(),
    /** The tool's `structuredContent`, including its citations. */
    result: jsonb("result").notNull(),
    /** Null when the call's end was never recorded. */
    latencyMs: integer("latency_ms")
  },
  (table) => [
    primaryKey({ columns: [table.requestId, table.callId] }),
    check("tool_calls_outcome_check", sql`${table.outcome} IN (${inList(TOOL_OUTCOMES)})`)
  ]
)
