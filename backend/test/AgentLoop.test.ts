import { describe, expect, it } from "@effect/vitest"
import { Duration, Effect, Fiber, Ref, Schema, Stream } from "effect"
import { AiError, Prompt } from "effect/ai"
import { TestClock } from "effect/testing"

import { LookupId } from "@policyhuis/protocol/QuestionsApi"

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
  requireFirstLookup: false,
  contextTokens: 1000,
  answerTokens: 100,
  bytesPerToken: 4
}

const LOOKUP_SERVER = { name: "test-data", label: "Test", title: "Look up a key" }
const serverOf = (toolName: string) => (toolName === "lookup" ? LOOKUP_SERVER : null)

const run = (script: ReadonlyArray<ScriptedTurn>, overrides: Partial<LoopSettings> = {}) =>
  Effect.gen(function* () {
    const toolkit = yield* TestToolkit
    const events = yield* runAgentLoop(Prompt.make("question"), toolkit, serverOf, { ...SETTINGS, ...overrides }).pipe(
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
      expect(tags(events)).toEqual(["LookupStarted", "LookupEnded", "TextChunk"])
      const started = events.find((event) => event._tag === "LookupStarted")
      expect(started?.source).toEqual({ name: "test-data", label: "Test" })
      expect(started?.title).toBe("Look up a key")
      expect(last(events).outcome).toBe("answered")
      const ended = events.find((event) => event._tag === "LookupEnded")
      expect(ended?.outcome).toBe("succeeded")
      expect(JSON.stringify(calls[1]?.prompt.content)).toContain("value of k")
    })
  )

  it.effect("runs two tool calls from one turn", () =>
    Effect.gen(function* () {
      const both: ScriptedTurn = {
        parts: [toolCall("c1", "lookup", { key: "a" }), toolCall("c2", "lookup", { key: "b" }), finish("tool-calls")]
      }
      const { events } = yield* run([both, answer])
      const started = events.filter((event) => event._tag === "ToolCallStarted")
      expect(started.map((event) => event.providerCallId)).toEqual(["c1", "c2"])
      const ended = events.filter((event) => event._tag === "LookupEnded").map((event) => event.lookupId)
      expect(ended.sort()).toEqual(started.map((event) => event.callId).sort())
    })
  )

  it.effect("gives every tool call its own UUID, even when the provider reuses a call ID across steps", () =>
    Effect.gen(function* () {
      const { events } = yield* run([lookup("call_0", "a"), lookup("call_0", "b"), answer])
      const starts = events.filter((event) => event._tag === "LookupStarted").map((event) => event.lookupId)
      expect(starts).toHaveLength(2)
      expect(new Set(starts).size).toBe(2)
      for (const lookupId of starts) expect(Schema.is(LookupId)(lookupId)).toBe(true)
      const ends = events.filter((event) => event._tag === "LookupEnded").map((event) => event.lookupId)
      expect(ends).toEqual(starts)
    })
  )

  it.effect("returns arguments that fail the tool's schema as a failed result the model corrects", () =>
    Effect.gen(function* () {
      const { events } = yield* run([lookup("c1", 5), lookup("c2", "k"), answer])
      const ends = events.filter((event) => event._tag === "LookupEnded")
      expect(ends.map((event) => [event.outcome, event.error])).toEqual([
        ["failed", "ToolParameterValidationError"],
        ["succeeded", null]
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

  it.effect("retries a turn whose text was held back, since none of it reached the browser", () =>
    Effect.gen(function* () {
      const partial: ScriptedTurn = { parts: text("a", "partial"), failWith: aiError(new AiError.RateLimitError({})) }
      const { events, calls } = yield* runTimed([partial, answer], "5 seconds")
      expect(calls).toHaveLength(2)
      expect(events.filter((event) => event._tag === "TextChunk").map((event) => event.text)).toEqual(["the answer"])
      expect(last(events).outcome).toBe("answered")
    })
  )

  it.effect("does not retry once a tool call has reached the browser", () =>
    Effect.gen(function* () {
      const afterCall: ScriptedTurn = {
        parts: [toolCall("c1", "lookup", { key: "k" })],
        failWith: aiError(new AiError.RateLimitError({}))
      }
      const { events, calls } = yield* run([afterCall])
      expect(calls).toHaveLength(1)
      expect(tags(events)).toContain("LookupStarted")
      expect(last(events).failure?._tag).toBe("ModelStopped")
    })
  )

  it.effect("never sends text from a turn that calls a tool", () =>
    Effect.gen(function* () {
      const narrated: ScriptedTurn = {
        parts: [...text("n", "Let me look that up."), toolCall("c1", "lookup", { key: "k" }), finish("tool-calls")]
      }
      const { events } = yield* run([narrated, answer])
      expect(events.filter((event) => event._tag === "TextChunk").map((event) => event.text)).toEqual(["the answer"])
    })
  )

  it.effect("continues after tool calls whatever finish reason the provider gives", () =>
    Effect.gen(function* () {
      const stopWithCall: ScriptedTurn = { parts: [toolCall("c1", "lookup", { key: "k" }), finish("stop")] }
      const { events } = yield* run([stopWithCall, answer])
      expect(last(events).outcome).toBe("answered")
    })
  )

  it.effect("fails an answer the provider filtered or stopped for another reason", () =>
    Effect.gen(function* () {
      const filtered = yield* run([{ parts: [...text("a", "partial"), finish("content-filter")] }])
      expect(last(filtered.events).outcome).toBe("failed")
      expect(last(filtered.events).failure?._tag).toBe("ContentRefused")
      const unknown = yield* run([{ parts: [...text("a", "partial"), finish("unknown")] }])
      expect(last(unknown.events).outcome).toBe("failed")
      expect(last(unknown.events).failure?._tag).toBe("UnexpectedFinish")
    })
  )

  it.effect("fails a turn whose response ended without a finish event, telling it apart from an unknown reason", () =>
    Effect.gen(function* () {
      const { events } = yield* run([{ parts: [...text("a", "partial")] }])
      expect(last(events).outcome).toBe("failed")
      expect(last(events).failure?._tag).toBe("MissingFinish")
    })
  )

  it.effect("ends with a final turn without tools at maxSteps", () =>
    Effect.gen(function* () {
      const { events, calls } = yield* run([lookup("c1", "a"), lookup("c2", "b"), lookup("c3", "c"), answer])
      expect(calls).toHaveLength(4)
      expect(calls[0]?.toolNames).toEqual(["lookup"])
      expect(calls[3]?.toolNames).toEqual([])
      expect(JSON.stringify(calls[3]?.prompt.content)).toContain("You have reached the limit on data lookups")
      expect(tags(events).at(-1)).toBe("TextChunk")
      const finished = last(events)
      expect(finished.outcome).toBe("step_limit")
      expect(finished.failure).toEqual(Failure.StepLimit({ maxSteps: SETTINGS.maxSteps }))
    })
  )

  it.effect("requires a tool call on the first step only when requireFirstLookup is set", () =>
    Effect.gen(function* () {
      const required = yield* run([lookup("c1", "a"), answer], { requireFirstLookup: true })
      expect(required.calls.map((call) => call.toolChoice)).toEqual(["required", "auto"])
      const free = yield* run([lookup("c1", "a"), answer])
      expect(free.calls.map((call) => call.toolChoice)).toEqual(["auto", "auto"])
    })
  )

  it.effect("keeps requiring a tool call when the first step is retried", () =>
    Effect.gen(function* () {
      const limited: ScriptedTurn = { parts: [], failWith: aiError(new AiError.RateLimitError({})) }
      const { calls } = yield* runTimed([limited, lookup("c1", "a"), answer], "5 seconds", {
        requireFirstLookup: true
      })
      expect(calls.map((call) => call.toolChoice)).toEqual(["required", "required", "auto"])
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
      expect(calls[1]?.toolNames).toEqual([])
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
