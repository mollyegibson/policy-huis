import { Option, Schema } from "effect"

import { Citation } from "@policyhuis/protocol/Citation"
import type { AgentStreamEvent, Complete } from "@policyhuis/protocol/QuestionsApi"

export type ToolCallStatus = "running" | "done" | "failed" | "unfinished"

export interface ToolCallView {
  readonly callId: string
  readonly tool: string
  readonly arguments: unknown
  readonly status: ToolCallStatus
  /** The tool's `structuredContent`; null until it succeeds. */
  readonly result: unknown
  /** The failure's type only, such as `UnknownValue`; null unless it failed. */
  readonly error: string | null
}

/** Everything the page shows about one question, folded from its event stream. */
export interface QuestionState {
  readonly answer: string
  readonly toolCalls: ReadonlyArray<ToolCallView>
  /** Every citation received so far, by `citationId`. */
  readonly citations: ReadonlyMap<string, Citation>
  /** Set by `Complete`, the last event of every stream that is not interrupted. */
  readonly complete: Complete | null
}

export const initialState: QuestionState = { answer: "", toolCalls: [], citations: new Map(), complete: null }

const ResultCitations = Schema.Struct({ citations: Schema.Array(Citation) })

/** A successful result's citations; none when its `citations` field is missing or fails to decode. */
const citationsOf = (result: unknown): ReadonlyArray<Citation> =>
  Option.match(Schema.decodeUnknownOption(ResultCitations)(result), {
    onNone: () => [],
    onSome: ({ citations }) => citations
  })

const updateCall = (
  calls: ReadonlyArray<ToolCallView>,
  callId: string,
  update: (call: ToolCallView) => ToolCallView
): ReadonlyArray<ToolCallView> => calls.map((call) => (call.callId === callId ? update(call) : call))

export const reduce = (state: QuestionState, event: AgentStreamEvent): QuestionState => {
  switch (event._tag) {
    case "TextChunk":
      return { ...state, answer: state.answer + event.text }
    case "ToolStart":
      return {
        ...state,
        toolCalls: [
          ...state.toolCalls,
          {
            callId: event.callId,
            tool: event.tool,
            arguments: event.arguments,
            status: "running",
            result: null,
            error: null
          }
        ]
      }
    case "ToolEnd": {
      const citations = new Map(state.citations)
      for (const citation of event.outcome === "success" ? citationsOf(event.result) : []) {
        citations.set(citation.citationId, citation)
      }
      return {
        ...state,
        citations,
        toolCalls: updateCall(state.toolCalls, event.callId, (call) => ({
          ...call,
          status: event.outcome === "success" ? "done" : "failed",
          result: event.result,
          error: event.error
        }))
      }
    }
    case "Keepalive":
      return state
    case "Complete":
      return {
        ...state,
        complete: event,
        toolCalls: state.toolCalls.map((call) => (call.status === "running" ? { ...call, status: "unfinished" } : call))
      }
  }
}
