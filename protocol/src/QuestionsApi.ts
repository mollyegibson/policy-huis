import { Schema } from "effect"
import { HttpApi, HttpApiEndpoint, HttpApiGroup, HttpApiSchema } from "effect/http-api"

import { Citation } from "./Citation.ts"

export class QuestionRequest extends Schema.Class<QuestionRequest>("QuestionRequest")({
  question: Schema.String.pipe(
    Schema.check(
      Schema.isMinLength(1, { message: "A question must not be empty" }),
      Schema.isMaxLength(2000, { message: "A question must be at most 2,000 characters" })
    )
  )
}) {}

/** The UUID the backend gives each lookup. */
export const LookupId = Schema.String.pipe(Schema.check(Schema.isUUID()))

export class TextChunk extends Schema.TaggedClass<TextChunk>()("TextChunk", {
  text: Schema.String
}) {}

/** The server a lookup goes to: its name in the backend's server directory, and the label shown for it. */
export const LookupSource = Schema.Struct({
  name: Schema.String,
  label: Schema.String
})
export type LookupSource = typeof LookupSource.Type

/**
 * The agent consulting a server: one tool call the model made. `tool` is the name the model called, with its server's
 * prefix, and `title` the tool's title as its server publishes it. `source` is null when no connected server offers
 * that name, and the lookup fails.
 */
export class LookupStarted extends Schema.TaggedClass<LookupStarted>()("LookupStarted", {
  lookupId: LookupId,
  source: Schema.NullOr(LookupSource),
  tool: Schema.String,
  title: Schema.String,
  arguments: Schema.Unknown
}) {}

/**
 * How a lookup ended. `unavailable` means its server, or the server's own database, could not be reached; `failed`
 * means the call itself was wrong, such as an unknown value.
 */
export const LookupOutcome = Schema.Literals(["succeeded", "failed", "unavailable"])
export type LookupOutcome = typeof LookupOutcome.Type

/**
 * A lookup's end. On success, `result` is the tool's `structuredContent`, unchanged, for display only: the browser
 * never reads citations from it, only from `Sources`. Otherwise `result` is null and `error` is the failure's type,
 * such as `UnknownValue` or `TransportError`; its details stay in the trace.
 */
export class LookupEnded extends Schema.TaggedClass<LookupEnded>()("LookupEnded", {
  lookupId: LookupId,
  outcome: LookupOutcome,
  result: Schema.Unknown,
  error: Schema.NullOr(Schema.String)
}) {}

/** The citations the backend read from a lookup's result; each `citationId` is sent once per question. */
export class Sources extends Schema.TaggedClass<Sources>()("Sources", {
  lookupId: LookupId,
  citations: Schema.Array(Citation)
}) {}

/** Sent when nothing else has been for `api.keepaliveInterval`, so the connection stays open; the browser app ignores it. */
export class Keepalive extends Schema.TaggedClass<Keepalive>()("Keepalive", {}) {}

/**
 * The last event of every stream that is not interrupted. `message` explains, for the user, why an answer is
 * incomplete, and is null when answered; `unavailableServers` names the data servers that could not be reached.
 */
export class Complete extends Schema.TaggedClass<Complete>()("Complete", {
  requestId: Schema.String.pipe(Schema.check(Schema.isUUID())),
  outcome: Schema.Literals(["answered", "step_limit", "context_limit", "truncated", "failed"]),
  message: Schema.NullOr(Schema.String),
  unavailableServers: Schema.Array(Schema.String)
}) {}

export const AgentStreamEvent = Schema.Union([TextChunk, LookupStarted, LookupEnded, Sources, Keepalive, Complete])
export type AgentStreamEvent = typeof AgentStreamEvent.Type

/** Returned as `503` before the stream starts, when the backend is already answering as many questions as it can. */
export class AgentUnavailable extends Schema.TaggedError<AgentUnavailable>()(
  "AgentUnavailable",
  {
    reason: Schema.Literals(["busy"]),
    message: Schema.String
  },
  { httpApiStatus: 503 }
) {}

/** `POST /api/v1/questions`: one question in, a stream of server-sent events out, always ending with `Complete`. */
export const QuestionsApi = HttpApiGroup.make("questions").add(
  HttpApiEndpoint.post("ask", "/questions", {
    payload: QuestionRequest,
    success: HttpApiSchema.StreamSse({ data: AgentStreamEvent }),
    error: AgentUnavailable
  })
)

/** The backend's API; every path is under `/api/v1`, so a later breaking change can live beside it as `/api/v2`. */
export const PolicyHuisApi = HttpApi.make("policyhuis").add(QuestionsApi).prefix("/api/v1")
