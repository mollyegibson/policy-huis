import { Data } from "effect"
import type { Response } from "effect/ai"

import type { TextChunk, ToolEnd, ToolStart } from "@policyhuis/protocol/QuestionsApi"

import type { Failure } from "./Failures.ts"
import type { Outcome } from "./Outcome.ts"

/** A model turn began; `final` marks the turn without tools that ends a question at a limit. */
export class StepStarted extends Data.TaggedClass("StepStarted")<{
  readonly step: number
  readonly final: boolean
}> {}

/** A model turn ended, with every part it produced, for the next prompt and the context budget. */
export class StepEnded extends Data.TaggedClass("StepEnded")<{
  readonly parts: ReadonlyArray<Response.AnyPart>
  readonly finishReason: Response.FinishReason
  readonly inputTokens: number | undefined
  readonly outputTokens: number | undefined
}> {}

/**
 * A tool call started, in epoch milliseconds, with what the trace records about it. `callId` is the UUID the backend
 * gave the call; `providerCallId` is the ID the model's provider gave it.
 */
export class ToolCallStarted extends Data.TaggedClass("ToolCallStarted")<{
  readonly callId: string
  readonly providerCallId: string
  readonly tool: string
  readonly arguments: unknown
  readonly at: number
}> {}

/** A tool call's result arrived, in epoch milliseconds. */
export class ToolCallEnded extends Data.TaggedClass("ToolCallEnded")<{
  readonly callId: string
  readonly at: number
}> {}

/** The full encoded error of a failed tool call, for the trace only; the browser receives its type in `ToolEnd`. */
export class ToolFailed extends Data.TaggedClass("ToolFailed")<{
  readonly callId: string
  readonly encodedError: unknown
}> {}

export class ModelRetried extends Data.TaggedClass("ModelRetried")<{
  readonly reason: string
}> {}

/** The question's last event; `failure` is null when the model answered. */
export class Finished extends Data.TaggedClass("Finished")<{
  readonly outcome: Outcome
  readonly failure: Failure | null
}> {}

/** Events the browser app receives. */
export type BrowserEvent = TextChunk | ToolStart | ToolEnd

/** Everything the loop emits: the browser's events plus the internal events the trace is folded from. */
export type LoopEvent =
  BrowserEvent | StepStarted | StepEnded | ToolCallStarted | ToolCallEnded | ToolFailed | ModelRetried | Finished

export const isBrowserEvent = (event: LoopEvent): event is BrowserEvent =>
  event._tag === "TextChunk" || event._tag === "ToolStart" || event._tag === "ToolEnd"
