import { describe, expect, it } from "@effect/vitest"

import { TextChunk, ToolEnd, ToolStart } from "@policyhuis/protocol/QuestionsApi"

import { Failure } from "../src/loop/Failures.ts"
import type { LoopEvent } from "../src/loop/LoopEvent.ts"
import { Finished, ModelRetried, StepEnded, StepStarted, ToolFailed, ToolTimed } from "../src/loop/LoopEvent.ts"
import { emptyTrace, foldTrace, traceErrorDetail, traceOutcome } from "../src/trace/Trace.ts"

const fold = (events: ReadonlyArray<LoopEvent>) => events.reduce(foldTrace, emptyTrace)

const toolStep: ReadonlyArray<LoopEvent> = [
  new StepStarted({ step: 0, final: false }),
  ToolStart.make({ callId: "c1", tool: "sf_lookup", arguments: { key: "k" } }),
  new ToolTimed({ callId: "c1", at: 1_000 }),
  ToolEnd.make({ callId: "c1", tool: "sf_lookup", outcome: "success", result: { value: "v" }, error: null }),
  new ToolTimed({ callId: "c1", at: 1_250 }),
  new StepEnded({ parts: [], finishReason: "tool-calls", inputTokens: 40, outputTokens: 5 })
]

describe("foldTrace", () => {
  it("adds up steps, tokens, text and each tool call's timing", () => {
    const trace = fold([
      ...toolStep,
      new ModelRetried({ reason: "rate limited" }),
      new StepStarted({ step: 1, final: false }),
      TextChunk.make({ text: "the " }),
      TextChunk.make({ text: "answer" }),
      new StepEnded({ parts: [], finishReason: "stop", inputTokens: 60, outputTokens: 8 }),
      new Finished({ outcome: "answered", failure: null })
    ])
    expect(trace.steps).toBe(2)
    expect(trace.modelRetries).toBe(1)
    expect(trace.answerText).toBe("the answer")
    expect([trace.inputTokens, trace.outputTokens]).toEqual([100, 13])
    expect(trace.toolCalls).toEqual([
      {
        callId: "c1",
        step: 0,
        tool: "sf_lookup",
        arguments: { key: "k" },
        outcome: "success",
        result: { value: "v" },
        startedAt: 1_000,
        endedAt: 1_250
      }
    ])
    expect(traceOutcome(trace)).toBe("answered")
    expect(traceErrorDetail(trace)).toBeNull()
  })

  it("records a failure's raw detail for the trace", () => {
    const trace = fold([
      ...toolStep,
      new Finished({ outcome: "failed", failure: Failure.ModelStopped({ detail: "connection reset" }) })
    ])
    expect(traceOutcome(trace)).toBe("failed")
    expect(traceErrorDetail(trace)).toBe("connection reset")
  })

  it("keeps a failed call's full encoded error, which the browser does not receive", () => {
    const trace = fold([
      new StepStarted({ step: 0, final: false }),
      ToolStart.make({ callId: "c1", tool: "sf_lookup", arguments: {} }),
      ToolEnd.make({ callId: "c1", tool: "sf_lookup", outcome: "failure", result: null, error: "TransportError" }),
      new ToolFailed({ callId: "c1", encodedError: { reason: { _tag: "TransportError", description: "refused" } } })
    ])
    expect(trace.toolCalls[0]?.outcome).toBe("failure")
    expect(trace.toolCalls[0]?.result).toEqual({ reason: { _tag: "TransportError", description: "refused" } })
  })

  it("marks a question with no Finished event as cancelled", () => {
    expect(traceOutcome(fold(toolStep))).toBe("cancelled")
  })
})
