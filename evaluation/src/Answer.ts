import { Schema } from "effect"

import { Citation } from "@policyhuis/protocol/Citation"
import { LookupOutcome } from "@policyhuis/protocol/QuestionsApi"
import type { AgentStreamEvent } from "@policyhuis/protocol/QuestionsApi"

/** One tool call the agent made, as the backend streamed it. `outcome` is null when the lookup never ended. */
export const Lookup = Schema.Struct({
  tool: Schema.String,
  arguments: Schema.Unknown,
  outcome: Schema.NullOr(LookupOutcome),
  result: Schema.Unknown,
  error: Schema.NullOr(Schema.String)
})
export type Lookup = typeof Lookup.Type

/**
 * Everything the backend streamed for one question: the answer's text, each lookup, every citation sent in `Sources`,
 * and the `Complete` event's fields, which are null when the stream ended without one. It travels to the checks as
 * the promptfoo result's `metadata.answer`.
 */
export const Answer = Schema.Struct({
  requestId: Schema.NullOr(Schema.String),
  outcome: Schema.NullOr(Schema.String),
  message: Schema.NullOr(Schema.String),
  unavailableServers: Schema.Array(Schema.String),
  model: Schema.NullOr(Schema.Struct({ configuration: Schema.String, modelId: Schema.String })),
  usage: Schema.NullOr(Schema.Struct({ inputTokens: Schema.Number, outputTokens: Schema.Number })),
  text: Schema.String,
  lookups: Schema.Array(Lookup),
  citations: Schema.Array(Citation)
})
export type Answer = typeof Answer.Type

/** Folds a question's events, in the order the backend sent them, into its `Answer`. */
export const foldAnswer = (events: Iterable<AgentStreamEvent>): Answer => {
  const text: Array<string> = []
  const lookups = new Map<string, Lookup>()
  const citations: Array<Citation> = []
  let complete: Extract<AgentStreamEvent, { _tag: "Complete" }> | undefined
  for (const event of events) {
    switch (event._tag) {
      case "TextChunk":
        text.push(event.text)
        break
      case "LookupStarted":
        lookups.set(event.lookupId, {
          tool: event.tool,
          arguments: event.arguments,
          outcome: null,
          result: null,
          error: null
        })
        break
      case "LookupEnded": {
        const started = lookups.get(event.lookupId)
        if (started !== undefined) {
          lookups.set(event.lookupId, { ...started, outcome: event.outcome, result: event.result, error: event.error })
        }
        break
      }
      case "Sources":
        citations.push(...event.citations)
        break
      case "Complete":
        complete = event
        break
      case "Keepalive":
        break
    }
  }
  return {
    requestId: complete?.requestId ?? null,
    outcome: complete?.outcome ?? null,
    message: complete?.message ?? null,
    unavailableServers: complete?.unavailableServers ?? [],
    model: complete?.model ?? null,
    usage: complete?.usage ?? null,
    text: text.join(""),
    lookups: [...lookups.values()],
    citations
  }
}
