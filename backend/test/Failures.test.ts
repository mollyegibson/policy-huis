import { describe, expect, it } from "@effect/vitest"
import { Duration, Result, Schema } from "effect"
import { AiError, Prompt } from "effect/ai"

import { estimateNextPromptTokens, fits } from "../src/loop/ContextBudget.ts"
import { Failure, messageFor, modelFailure, retryClass } from "../src/loop/Failures.ts"
import { StepEnded } from "../src/loop/LoopEvent.ts"
import { aiError } from "./support/ScriptedModel.ts"

describe("retryClass", () => {
  it("retries transient provider errors after a backoff", () => {
    expect(retryClass(aiError(new AiError.RateLimitError({})))._tag).toBe("transient")
    expect(retryClass(aiError(new AiError.InternalProviderError({ description: "502" })))._tag).toBe("transient")
  })

  it("retries an invalid tool call with a correction naming the tool", () => {
    const retry = retryClass(
      aiError(new AiError.ToolParameterValidationError({ toolName: "sf_lookup", description: "bad JSON" }))
    )
    expect(retry).toEqual({
      _tag: "correct",
      message:
        "Your call to sf_lookup could not be run: bad JSON. Call it again with arguments that are valid JSON matching its parameters."
    })
    const undeclared = Schema.decodeUnknownResult(Schema.String)(1)
    if (Result.isSuccess(undeclared)) throw new Error("expected a decode failure")
    expect(retryClass(undeclared.failure)._tag).toBe("correct")
  })

  it("fails fast on request, authentication and quota errors", () => {
    expect(retryClass(aiError(new AiError.InvalidRequestError({})))._tag).toBe("none")
    expect(retryClass(aiError(new AiError.AuthenticationError({ kind: "InvalidKey" })))._tag).toBe("none")
    expect(retryClass(new Error("not a model error"))._tag).toBe("none")
  })
})

describe("modelFailure", () => {
  const tagOf = (reason: AiError.AiErrorReason) => modelFailure(aiError(reason), "raw")._tag

  it("gives each kind of model error its own failure", () => {
    expect(tagOf(new AiError.RateLimitError({}))).toBe("RateLimited")
    expect(tagOf(new AiError.InternalProviderError({ description: "502" }))).toBe("ModelUnreachable")
    expect(tagOf(new AiError.AuthenticationError({ kind: "InvalidKey" }))).toBe("AuthenticationFailed")
    expect(tagOf(new AiError.QuotaExhaustedError({}))).toBe("QuotaExhausted")
    expect(tagOf(new AiError.ContentPolicyError({ description: "policy" }))).toBe("ContentRefused")
    expect(tagOf(new AiError.InvalidRequestError({}))).toBe("RequestRejected")
    expect(tagOf(new AiError.UnknownError({}))).toBe("UnreadableResponse")
    expect(tagOf(new AiError.ToolParameterValidationError({ toolName: "t", description: "d" }))).toBe(
      "InvalidToolCalls"
    )
    expect(modelFailure(new Error("bug"), "raw")._tag).toBe("Internal")
  })
})

describe("messageFor", () => {
  const context = {
    requestId: "00000000-0000-4000-8000-000000000001",
    maxSteps: 10,
    stepTimeout: Duration.seconds(60),
    requestTimeout: Duration.minutes(3)
  }

  it("fills in the configured limits and the request ID", () => {
    expect(messageFor(Failure.StepLimit(), context)).toContain("more than 10 rounds of data lookups")
    expect(messageFor(Failure.StepTimedOut(), context)).toContain("longer than 60 seconds")
    expect(messageFor(Failure.RequestTimedOut(), context)).toContain("longer than 180 seconds")
    expect(messageFor(Failure.Internal({ detail: "boom" }), context)).toContain(context.requestId)
  })

  it("has a distinct message for every failure", () => {
    const failures = [
      Failure.StepLimit(),
      Failure.ContextLimit(),
      Failure.Truncated(),
      Failure.StepTimedOut(),
      Failure.RequestTimedOut(),
      ...(
        [
          "ModelUnreachable",
          "RateLimited",
          "AuthenticationFailed",
          "QuotaExhausted",
          "ContentRefused",
          "RequestRejected",
          "UnreadableResponse",
          "InvalidToolCalls",
          "ModelStopped",
          "Internal"
        ] as const
      ).map((tag) => Failure[tag]({ detail: "raw" }))
    ]
    const messages = new Set(failures.map((failure) => messageFor(failure, context)))
    expect(messages.size).toBe(failures.length)
  })

  it("never shows the raw error", () => {
    expect(messageFor(Failure.ModelStopped({ detail: "secret upstream detail" }), context)).not.toContain("secret")
  })
})

describe("context budget", () => {
  const settings = { contextTokens: 1000, answerTokens: 100, bytesPerToken: 4 }

  it("adds the step's reported tokens to its tool results' bytes", () => {
    const ended = new StepEnded({ parts: [], finishReason: "tool-calls", inputTokens: 800, outputTokens: 50 })
    expect(estimateNextPromptTokens(ended, Prompt.empty, settings)).toBe(850)
    expect(fits(900, settings)).toBe(true)
    expect(fits(901, settings)).toBe(false)
  })

  it("estimates from the whole prompt when the provider reported no usage", () => {
    const ended = new StepEnded({
      parts: [],
      finishReason: "tool-calls",
      inputTokens: undefined,
      outputTokens: undefined
    })
    const prompt = Prompt.make("x".repeat(4000))
    expect(estimateNextPromptTokens(ended, prompt, settings)).toBeGreaterThan(1000)
  })
})
