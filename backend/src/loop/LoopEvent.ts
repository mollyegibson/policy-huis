import { Data } from "effect"
import type { Response } from "effect/ai"

import type { LookupEnded, LookupStarted, Sources, TextChunk } from "@policyhuis/protocol/QuestionsApi"

import type { Failure } from "./Failures.ts"
import type { Outcome } from "./Outcome.ts"

/** A model turn began; `final` marks the turn without tools that ends a question at a limit. */
export class StepStarted extends Data.TaggedClass("StepStarted")<{
  readonly step: number
  readonly final: boolean
}> {}

/**
 * A model turn ended, with every part it produced, for the next prompt and the context budget. `finishReason` is null
 * when the response ended without a finish event.
 */
export class StepEnded extends Data.TaggedClass("StepEnded")<{
  readonly parts: ReadonlyArray<Response.AnyPart>
  readonly finishReason: Response.FinishReason | null
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

/** The full encoded error of a failed tool call, for the trace only; the browser receives its type in `LookupEnded`. */
export class ToolFailed extends Data.TaggedClass("ToolFailed")<{
  readonly callId: string
  readonly encodedError: unknown
}> {}

/**
 * A successful result's citations that could not be read: `rejected` entries broke the citation convention, or the
 * result had no `citations` list at all. They are left out of `Sources`; the result itself, in the trace, keeps them.
 */
export class CitationsRejected extends Data.TaggedClass("CitationsRejected")<{
  readonly callId: string
  readonly tool: string
  readonly rejected: number
  readonly missing: boolean
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
export type BrowserEvent = TextChunk | LookupStarted | LookupEnded | Sources

/** Everything the loop emits: the browser's events plus the internal events the trace is folded from. */
export type LoopEvent =
  | BrowserEvent
  | StepStarted
  | StepEnded
  | ToolCallStarted
  | ToolCallEnded
  | ToolFailed
  | CitationsRejected
  | ModelRetried
  | Finished

export const isBrowserEvent = (event: LoopEvent): event is BrowserEvent =>
  event._tag === "TextChunk" ||
  event._tag === "LookupStarted" ||
  event._tag === "LookupEnded" ||
  event._tag === "Sources"
