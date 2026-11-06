import { Schema } from "effect"
import { HttpApi, HttpApiEndpoint, HttpApiGroup, HttpApiSchema } from "effect/http-api"

export class QuestionRequest extends Schema.Class<QuestionRequest>("QuestionRequest")({
  question: Schema.String.pipe(
    Schema.check(
      Schema.isMinLength(1, { message: "A question must not be empty" }),
      Schema.isMaxLength(2000, { message: "A question must be at most 2,000 characters" })
    )
  )
}) {}

/** The UUID the backend gives each tool call. */
export const CallId = Schema.String.pipe(Schema.check(Schema.isUUID()))

export class TextChunk extends Schema.TaggedClass<TextChunk>()("TextChunk", {
  text: Schema.String
}) {}

export class ToolStart extends Schema.TaggedClass<ToolStart>()("ToolStart", {
  callId: CallId,
  tool: Schema.String,
  arguments: Schema.Unknown
}) {}

/**
 * A tool call's outcome. On success, `result` is the tool's `structuredContent`, passed through unchanged for the
 * browser to render, and `error` is null. On failure, `result` is null and `error` is the failure's type only, such as
 * `UnknownValue` or `TransportError`; its details stay in the trace.
 */
export class ToolEnd extends Schema.TaggedClass<ToolEnd>()("ToolEnd", {
  callId: CallId,
  tool: Schema.String,
  outcome: Schema.Literals(["success", "failure"]),
  result: Schema.Unknown,
  error: Schema.NullOr(Schema.String)
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

export const AgentStreamEvent = Schema.Union([TextChunk, ToolStart, ToolEnd, Keepalive, Complete])
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
