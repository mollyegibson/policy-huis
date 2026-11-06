import type { Failure } from "../loop/Failures.ts"
import { failureDetail } from "../loop/Failures.ts"
import type { LoopEvent } from "../loop/LoopEvent.ts"
import type { Outcome, ToolOutcome } from "../loop/Outcome.ts"
import { OUTCOMES } from "../loop/Outcome.ts"

/** How a question's trace ended: the loop's outcome, or `cancelled` when the browser disconnected first. */
export const TRACE_OUTCOMES = [...OUTCOMES, "cancelled"] as const
export type TraceOutcome = (typeof TRACE_OUTCOMES)[number]

export interface ToolCallTrace {
  readonly callId: string
  readonly providerCallId: string
  readonly step: number
  readonly tool: string
  readonly arguments: unknown
  readonly outcome: ToolOutcome | null
  readonly result: unknown
  readonly startedAt: number
  readonly endedAt: number | null
}

/** What one question's events add up to; written to `app.requests` and `app.tool_calls` when the stream ends. */
export interface Trace {
  readonly steps: number
  readonly currentStep: number
  readonly modelRetries: number
  readonly answerText: string
  readonly inputTokens: number
  readonly outputTokens: number
  readonly toolCalls: ReadonlyArray<ToolCallTrace>
  readonly outcome: Outcome | null
  readonly failure: Failure | null
}

export const emptyTrace: Trace = {
  steps: 0,
  currentStep: 0,
  modelRetries: 0,
  answerText: "",
  inputTokens: 0,
  outputTokens: 0,
  toolCalls: [],
  outcome: null,
  failure: null
}

const updateCall = (trace: Trace, callId: string, update: (call: ToolCallTrace) => ToolCallTrace): Trace => ({
  ...trace,
  toolCalls: trace.toolCalls.map((call) => (call.callId === callId ? update(call) : call))
})

export const foldTrace = (trace: Trace, event: LoopEvent): Trace => {
  switch (event._tag) {
    case "StepStarted":
      return { ...trace, steps: trace.steps + 1, currentStep: event.step }
    case "StepEnded":
      return {
        ...trace,
        inputTokens: trace.inputTokens + (event.inputTokens ?? 0),
        outputTokens: trace.outputTokens + (event.outputTokens ?? 0)
      }
    case "TextChunk":
      return { ...trace, answerText: trace.answerText + event.text }
    case "ToolCallStarted":
      return {
        ...trace,
        toolCalls: [
          ...trace.toolCalls,
          {
            callId: event.callId,
            providerCallId: event.providerCallId,
            step: trace.currentStep,
            tool: event.tool,
            arguments: event.arguments,
            outcome: null,
            result: null,
            startedAt: event.at,
            endedAt: null
          }
        ]
      }
    case "ToolCallEnded":
      return updateCall(trace, event.callId, (call) => ({ ...call, endedAt: event.at }))
    case "ToolEnd":
      return updateCall(trace, event.callId, (call) => ({ ...call, outcome: event.outcome, result: event.result }))
    case "ToolFailed":
      return updateCall(trace, event.callId, (call) => ({ ...call, result: event.encodedError }))
    case "ToolStart":
      return trace
    case "ModelRetried":
      return { ...trace, modelRetries: trace.modelRetries + 1 }
    case "Finished":
      return { ...trace, outcome: event.outcome, failure: event.failure }
  }
}

/** A question whose stream ended without `Finished` was interrupted, because the browser disconnected. */
export const traceOutcome = (trace: Trace): TraceOutcome => trace.outcome ?? "cancelled"

export const traceErrorDetail = (trace: Trace): string | null =>
  trace.failure === null ? null : failureDetail(trace.failure)
