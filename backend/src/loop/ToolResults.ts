import { Option, Predicate, Schema } from "effect"
import { AiError, McpClientError } from "effect/ai"

/** The `structuredContent` of a successful MCP result, which the browser app receives; null when there is none. */
export const structuredContent = (result: unknown): unknown =>
  Predicate.hasProperty(result, "structuredContent") ? result.structuredContent : null

/** An error result from a server: its text content is the JSON-encoded tool failure, such as `UnknownValue`. */
const ServerFailure = Schema.fromJsonString(Schema.Struct({ _tag: Schema.String }))

/**
 * The type of a failed tool call, which is all the browser app receives about it: the server's own error type for an
 * error result (such as `UnknownValue`), else the client or toolkit error's reason (such as `TransportError`). The
 * error's details, which can name internal hosts, go only to the trace.
 */
export const errorType = (error: unknown): string => {
  if (AiError.isAiError(error)) return error.reason._tag
  if (McpClientError.isMcpClientError(error)) {
    const reason = error.reason
    if (reason._tag !== "ToolError") return reason._tag
    const text = reason.result.content.find((block) => block.type === "text")
    if (text === undefined) return reason._tag
    return Option.match(Schema.decodeUnknownOption(ServerFailure)(text.text), {
      onNone: () => reason._tag,
      onSome: (failure) => failure._tag
    })
  }
  return "UnknownError"
}
