import { Option, Predicate, Schema } from "effect"
import { AiError, McpClientError } from "effect/ai"

import { Citation } from "@policyhuis/protocol/Citation"
import type { LookupOutcome } from "@policyhuis/protocol/QuestionsApi"

/** The `structuredContent` of a successful MCP result; null when there is none. */
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

/**
 * Error types that mean a server could not answer at all, rather than that the call was wrong: the server could not be
 * reached (`TransportError`, `ClosedError`), or it could not reach its own database (`DatabaseUnavailable`, by the
 * tool-error convention every server follows).
 */
const UNAVAILABLE_ERRORS: ReadonlySet<string> = new Set(["TransportError", "ClosedError", "DatabaseUnavailable"])

/** How a failed lookup ended, from its error type. */
export const failedOutcome = (type: string): LookupOutcome => (UNAVAILABLE_ERRORS.has(type) ? "unavailable" : "failed")

/**
 * A citation as a server returns it under the citation convention. `publisher`, `locator` and `quote` may be left out,
 * and any field a server adds of its own is ignored.
 */
const ServerCitation = Schema.Struct({
  citationId: Schema.String,
  sourceId: Schema.String,
  title: Schema.String,
  publisher: Schema.optional(Schema.NullOr(Schema.String)),
  sourceUrl: Schema.String,
  version: Schema.String,
  locator: Schema.optional(Schema.NullOr(Schema.String)),
  quote: Schema.optional(Schema.NullOr(Schema.String))
})

const ResultCitations = Schema.Struct({ citations: Schema.Array(Schema.Unknown) })

const toCitation = (raw: unknown): Option.Option<Citation> =>
  Option.flatMap(Schema.decodeUnknownOption(ServerCitation)(raw), (c) =>
    Schema.decodeUnknownOption(Citation)({
      citationId: c.citationId,
      sourceId: c.sourceId,
      title: c.title,
      publisher: c.publisher ?? null,
      sourceUrl: c.sourceUrl,
      version: c.version,
      locator: c.locator ?? null,
      quote: c.quote ?? null
    })
  )

/** The citations read from a result, and what could not be read: entries that break the convention, or no list. */
export interface ReadCitations {
  readonly citations: ReadonlyArray<Citation>
  readonly rejected: number
  readonly missing: boolean
}

/** Reads the `citations` of a successful result's `structuredContent`, keeping each entry that follows the convention. */
export const readCitations = (content: unknown): ReadCitations =>
  Option.match(Schema.decodeUnknownOption(ResultCitations)(content), {
    onNone: () => ({ citations: [], rejected: 0, missing: true }),
    onSome: ({ citations }) => {
      const read = citations.map(toCitation)
      return {
        citations: read.filter(Option.isSome).map((c) => c.value),
        rejected: read.filter(Option.isNone).length,
        missing: false
      }
    }
  })
