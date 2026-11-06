import { describe, expect, it } from "@effect/vitest"
import { Duration, Effect, Fiber, Ref, Stream } from "effect"
import { AiError, Prompt } from "effect/ai"
import { TestClock } from "effect/testing"

import type { LoopSettings } from "../src/loop/AgentLoop.ts"
import { runAgentLoop } from "../src/loop/AgentLoop.ts"
import { Failure } from "../src/loop/Failures.ts"
import type { LoopEvent } from "../src/loop/LoopEvent.ts"
import { isBrowserEvent } from "../src/loop/LoopEvent.ts"
import type { ScriptedTurn } from "./support/ScriptedModel.ts"
import {
  aiError,
  finish,
  ModelCalls,
  scriptedModel,
  TestToolkit,
  TestToolkitHandlers,
  text,
  toolCall
} from "./support/ScriptedModel.ts"

/** Synthetic limits for these tests only; the backend's values are in config/agent.yaml. */
const SETTINGS: LoopSettings = {
  maxSteps: 3,
  stepTimeout: Duration.seconds(10),
  requestTimeout: Duration.seconds(60),
  modelRetries: 2,
  modelRetryBaseDelay: Duration.seconds(1),
  toolConcurrency: 2,
  contextTokens: 1000,
  answerTokens: 100,
  bytesPerToken: 4
}

const run = (script: ReadonlyArray<ScriptedTurn>, overrides: Partial<LoopSettings> = {}) =>
  Effect.gen(function* () {
    const toolkit = yield* TestToolkit
    const events = yield* runAgentLoop(Prompt.make("question"), toolkit, { ...SETTINGS, ...overrides }).pipe(
      Stream.runCollect
    )
    const calls = yield* Ref.get(yield* ModelCalls)
    return { events: Array.from(events), calls }
  }).pipe(Effect.provide(scriptedModel(script)), Effect.provide(TestToolkitHandlers))

/**
 * Runs the loop while advancing the test clock in small steps, so the loop's timers (backoff, timeouts, scripted
 * delays) are already waiting when time passes.
 */
const runTimed = (
  script: ReadonlyArray<ScriptedTurn>,
  advance: Duration.Input,
  overrides: Partial<LoopSettings> = {}
) =>
  Effect.gen(function* () {
    const fiber = yield* Effect.forkChild(run(script, overrides))
    const total = Duration.toMillis(Duration.fromInputUnsafe(advance))
    for (let elapsed = 0; elapsed < total; elapsed += 100) yield* TestClock.adjust("100 millis")
    return yield* Fiber.join(fiber)
  })

const tags = (events: ReadonlyArray<LoopEvent>) => events.filter(isBrowserEvent).map((event) => event._tag)

const last = (events: ReadonlyArray<LoopEvent>) => {
  const event = events.at(-1)
  if (event?._tag !== "Finished") throw new Error(`expected Finished last, got ${String(event?._tag)}`)
  return event
}

const answer: ScriptedTurn = { parts: [...text("a", "the answer"), finish("stop", 50, 10)] }
const lookup = (id: string, key: unknown): ScriptedTurn => ({
  parts: [toolCall(id, "lookup", { key }), finish("tool-calls", 50, 10)]
})

describe("runAgentLoop", () => {
  it.effect("calls a tool, then answers from its result", () =>
    Effect.gen(function* () {
      const { events, calls } = yield* run([lookup("c1", "k"), answer])
      expect(tags(events)).toEqual(["ToolStart", "ToolEnd", "TextChunk"])
      expect(last(events).outcome).toBe("answered")
      const toolEnd = events.find((event) => event._tag === "ToolEnd")
      expect(toolEnd?.outcome).toBe("success")
      expect(JSON.stringify(calls[1]?.prompt.content)).toContain("value of k")
    })
  )

  it.effect("runs two tool calls from one turn", () =>
    Effect.gen(function* () {
      const both: ScriptedTurn = {
        parts: [toolCall("c1", "lookup", { key: "a" }), toolCall("c2", "lookup", { key: "b" }), finish("tool-calls")]
      }
      const { events } = yield* run([both, answer])
      expect(
        events
          .filter((event) => event._tag === "ToolEnd")
          .map((event) => event.callId)
          .sort()
      ).toEqual(["c1", "c2"])
    })
  )

  it.effect("returns arguments that fail the tool's schema as a failed result the model corrects", () =>
    Effect.gen(function* () {
      const { events } = yield* run([lookup("c1", 5), lookup("c2", "k"), answer])
      const ends = events.filter((event) => event._tag === "ToolEnd")
      expect(ends.map((event) => [event.outcome, event.error])).toEqual([
        ["failure", "ToolParameterValidationError"],
        ["success", null]
      ])
      expect(ends[0]?.result).toBeNull()
      expect(ends[1]?.result).toEqual({ value: "value of k", padding: "" })
      const failed = events.find((event) => event._tag === "ToolFailed")
      expect(JSON.stringify(failed?.encodedError)).toContain("ToolParameterValidationError")
      expect(last(events).outcome).toBe("answered")
    })
  )

  it.effect("retries a tool call that is not valid JSON with a correction message", () =>
    Effect.gen(function* () {
      const invalid: ScriptedTurn = {
        parts: [],
        failWith: aiError(new AiError.ToolParameterValidationError({ toolName: "lookup", description: "bad JSON" }))
      }
      const { events, calls } = yield* run([invalid, answer])
      expect(events.some((event) => event._tag === "ModelRetried")).toBe(true)
      expect(JSON.stringify(calls[1]?.prompt.content)).toContain("Your call to lookup could not be run: bad JSON")
      expect(last(events).outcome).toBe("answered")
    })
  )

  it.effect("retries a rate-limit error after the backoff", () =>
    Effect.gen(function* () {
      const limited: ScriptedTurn = { parts: [], failWith: aiError(new AiError.RateLimitError({})) }
      const { events, calls } = yield* runTimed([limited, answer], "2 seconds")
      expect(calls).toHaveLength(2)
      expect(last(events).outcome).toBe("answered")
    })
  )

  it.effect("fails at once on an authentication error", () =>
    Effect.gen(function* () {
      const denied: ScriptedTurn = {
        parts: [],
        failWith: aiError(new AiError.AuthenticationError({ kind: "InvalidKey" }))
      }
      const { events, calls } = yield* run([denied])
      expect(calls).toHaveLength(1)
      const finished = last(events)
      expect(finished.outcome).toBe("failed")
      expect(finished.failure?._tag).toBe("AuthenticationFailed")
    })
  )

  it.effect("gives up after modelRetries transient errors", () =>
    Effect.gen(function* () {
      const limited: ScriptedTurn = { parts: [], failWith: aiError(new AiError.RateLimitError({})) }
      const { events, calls } = yield* runTimed([limited, limited, limited], "10 seconds")
      expect(calls).toHaveLength(3)
      expect(last(events).failure?._tag).toBe("RateLimited")
    })
  )

  it.effect("does not retry once text has reached the browser", () =>
    Effect.gen(function* () {
      const partial: ScriptedTurn = { parts: text("a", "partial"), failWith: aiError(new AiError.RateLimitError({})) }
      const { events, calls } = yield* run([partial])
      expect(calls).toHaveLength(1)
      expect(tags(events)).toEqual(["TextChunk"])
      expect(last(events).failure?._tag).toBe("ModelStopped")
    })
  )

  it.effect("ends with a final turn without tools at maxSteps", () =>
    Effect.gen(function* () {
      const { events, calls } = yield* run([lookup("c1", "a"), lookup("c2", "b"), lookup("c3", "c"), answer])
      expect(calls).toHaveLength(4)
      expect(calls[3]?.toolChoice).toBe("none")
      expect(JSON.stringify(calls[3]?.prompt.content)).toContain("You have reached the limit on data lookups")
      expect(tags(events).at(-1)).toBe("TextChunk")
      const finished = last(events)
      expect(finished.outcome).toBe("step_limit")
      expect(finished.failure).toEqual(Failure.StepLimit())
    })
  )

  it.effect("fails a step that stalls past the step timeout", () =>
    Effect.gen(function* () {
      const stalled: ScriptedTurn = { parts: [], stall: true }
      const { events } = yield* runTimed([stalled], "11 seconds")
      expect(last(events).failure?._tag).toBe("StepTimedOut")
    })
  )

  it.effect("fails a question that runs past the request timeout", () =>
    Effect.gen(function* () {
      const slow = (id: string): ScriptedTurn => ({ ...lookup(id, "k"), delay: "4 seconds" })
      const { events } = yield* runTimed([slow("c1"), slow("c2"), slow("c3")], "10 seconds", {
        maxSteps: 10,
        stepTimeout: Duration.seconds(5),
        requestTimeout: Duration.seconds(10)
      })
      expect(last(events).failure?._tag).toBe("RequestTimedOut")
    })
  )

  it.effect("answers from the earlier prompt when a result would overflow the context", () =>
    Effect.gen(function* () {
      const { events, calls } = yield* run([lookup("c1", "big"), answer])
      expect(calls[1]?.toolChoice).toBe("none")
      const finalPrompt = JSON.stringify(calls[1]?.prompt.content)
      expect(finalPrompt).not.toContain("xxxx")
      expect(finalPrompt).toContain("The data looked up is more than you can read at once")
      expect(last(events).outcome).toBe("context_limit")
    })
  )

  it.effect("ends as truncated when a turn reaches the output cap", () =>
    Effect.gen(function* () {
      const cutAnswer: ScriptedTurn = { parts: [...text("a", "cut off"), finish("length")] }
      const cutToolTurn: ScriptedTurn = { parts: [toolCall("c1", "lookup", { key: "k" }), finish("length")] }
      expect(last((yield* run([cutAnswer])).events).outcome).toBe("truncated")
      expect(last((yield* run([cutToolTurn])).events).outcome).toBe("truncated")
      const atLimit = yield* run([lookup("c1", "a"), lookup("c2", "b"), lookup("c3", "c"), cutAnswer])
      expect(last(atLimit.events).outcome).toBe("truncated")
    })
  )
})
