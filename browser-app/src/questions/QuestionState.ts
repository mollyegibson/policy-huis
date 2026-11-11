import type { Citation } from "@policyhuis/protocol/Citation"
import type { AgentStreamEvent, Complete, LookupOutcome, LookupSource } from "@policyhuis/protocol/QuestionsApi"

export type LookupStatus = "running" | LookupOutcome | "unfinished"

export interface LookupView {
  readonly lookupId: string
  /** The server the lookup went to, as the backend named it; null when no server offered the tool. */
  readonly source: LookupSource | null
  /** The name the model called, with its server's prefix. */
  readonly tool: string
  readonly title: string
  readonly arguments: unknown
  readonly status: LookupStatus
  /** The tool's `structuredContent`, shown as it is; null until it succeeds. Citations are never read from it. */
  readonly result: unknown
  /** The failure's type only, such as `UnknownValue`; null unless it failed or its server was unavailable. */
  readonly error: string | null
}

/** Everything the page shows about one question, folded from its event stream. */
export interface QuestionState {
  readonly answer: string
  readonly lookups: ReadonlyArray<LookupView>
  /** Every citation received so far in `Sources`, by `citationId`. */
  readonly citations: ReadonlyMap<string, Citation>
  /** Set by `Complete`, the last event of every stream that is not interrupted. */
  readonly complete: Complete | null
}

export const initialState: QuestionState = { answer: "", lookups: [], citations: new Map(), complete: null }

const updateLookup = (
  lookups: ReadonlyArray<LookupView>,
  lookupId: string,
  update: (lookup: LookupView) => LookupView
): ReadonlyArray<LookupView> => lookups.map((lookup) => (lookup.lookupId === lookupId ? update(lookup) : lookup))

export const reduce = (state: QuestionState, event: AgentStreamEvent): QuestionState => {
  switch (event._tag) {
    case "TextChunk":
      return { ...state, answer: state.answer + event.text }
    case "LookupStarted":
      return {
        ...state,
        lookups: [
          ...state.lookups,
          {
            lookupId: event.lookupId,
            source: event.source,
            tool: event.tool,
            title: event.title,
            arguments: event.arguments,
            status: "running",
            result: null,
            error: null
          }
        ]
      }
    case "LookupEnded":
      return {
        ...state,
        lookups: updateLookup(state.lookups, event.lookupId, (lookup) => ({
          ...lookup,
          status: event.outcome,
          result: event.result,
          error: event.error
        }))
      }
    case "Sources":
      return {
        ...state,
        citations: new Map([...state.citations, ...event.citations.map((c): [string, Citation] => [c.citationId, c])])
      }
    case "Keepalive":
      return state
    case "Complete":
      return {
        ...state,
        complete: event,
        lookups: state.lookups.map((lookup) =>
          lookup.status === "running" ? { ...lookup, status: "unfinished" } : lookup
        )
      }
  }
}
