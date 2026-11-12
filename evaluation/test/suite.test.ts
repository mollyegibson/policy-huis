import { fileURLToPath } from "node:url"

import * as NodeServices from "@effect/platform-node/NodeServices"
import { describe, expect, it } from "@effect/vitest"
import { Effect, Exit, Schema } from "effect"
import type { AssertionValueFunctionContext } from "promptfoo"

import { foldAnswer } from "../src/Answer.ts"
import { toProviderResponse } from "../src/BackendProvider.ts"
import { loadQuestions, QuestionFile } from "../src/Questions.ts"
import { assertionsFor } from "../src/suite.ts"
import { Complete, LookupEnded, LookupStarted, Sources, TextChunk } from "@policyhuis/protocol/QuestionsApi"
import { answer, ordinance } from "./fixtures.ts"

const QUESTIONS = fileURLToPath(new URL("../questions/sf.yaml", import.meta.url))

describe("the question file", () => {
  it.effect("decodes, with 75 questions", () =>
    Effect.gen(function* () {
      const { questions } = yield* loadQuestions(QUESTIONS)
      expect(questions).toHaveLength(75)
    }).pipe(Effect.provide(NodeServices.layer))
  )

  it("rejects a repeated question ID", () => {
    const question = { id: "sf-bla-01", type: "report", question: "Q?", expect: {} }
    const decoded = Schema.decodeUnknownExit(QuestionFile)({ questions: [question, question] })
    expect(Exit.isFailure(decoded)).toBe(true)
  })
})

describe("assertionsFor", () => {
  it("gives every question the four answer checks, and the rest from its expectations", () => {
    const metrics = assertionsFor({
      id: "sf-mix-01",
      type: "rule + data",
      question: "Can my landlord raise my rent by 10%?",
      expect: {
        tools: ["sf_data_allowable_rent_increase"],
        documents: ["rent_ordinance"],
        notDocuments: ["bla_affordable_housing"],
        facts: [{ any: ["1.6%", "1.6 percent"], source: "allowable_rent_increase, version 2026-05-01" }]
      }
    }).map((assertion) => [assertion.type, assertion.metric, assertion.value])
    expect(metrics).toEqual([
      ["javascript", "completed", expect.any(Function)],
      ["javascript", "citationIdsExact", expect.any(Function)],
      ["javascript", "citesFigures", expect.any(Function)],
      ["javascript", "figuresFromTools", expect.any(Function)],
      ["javascript", "calledExpectedTool", expect.any(Function)],
      ["contains", "citedExpectedDocuments", "[sf_docs.rent_ordinance@"],
      ["not-contains", "notCitedDocuments", "[sf_docs.bla_affordable_housing@"],
      ["javascript", "expectedFacts", expect.any(Function)]
    ])
  })

  it("runs a check on the answer the provider attached, and fails a result that carries none", async () => {
    const [completedCheck] = assertionsFor({ id: "sf-decline-02", type: "decline", question: "Q?", expect: {} })
    const check = completedCheck?.value
    if (typeof check !== "function") throw new Error("expected a javascript assertion")
    const context = (metadata: Record<string, unknown> | undefined): AssertionValueFunctionContext => ({
      prompt: "Q?",
      vars: {},
      test: {},
      logProbs: undefined,
      provider: undefined,
      providerResponse: metadata === undefined ? undefined : { output: "A.", metadata }
    })
    expect(await check("A.", context({ answer: answer("A.") }))).toMatchObject({ pass: true })
    expect(await check("A.", context(undefined))).toMatchObject({ pass: false })
  })
})

describe("toProviderResponse", () => {
  const citation = ordinance("37.3(a)(1)")
  const lookupId = "0d5c2a3e-6a51-4a6f-8a0b-7d6b5e0c9f11"
  const requestId = "6f1c3c9e-2b8a-4b55-9d84-0f6a8c1d2e3f"

  it("grades an answered question, carrying everything the backend streamed", () => {
    const events = [
      LookupStarted.make({ lookupId, source: null, tool: "sf_docs_search_policy", title: "Search", arguments: {} }),
      LookupEnded.make({ lookupId, outcome: "succeeded", result: { passages: [] }, error: null }),
      Sources.make({ lookupId, citations: [citation] }),
      TextChunk.make({ text: "Up to the allowable " }),
      TextChunk.make({ text: `increase [${citation.citationId}].` }),
      Complete.make({
        requestId,
        outcome: "answered",
        message: null,
        unavailableServers: [],
        model: { configuration: "frontier", modelId: "claude-opus-5-5" },
        usage: { inputTokens: 900, outputTokens: 120 }
      })
    ]
    const response = toProviderResponse(foldAnswer(events))
    expect(response.output).toBe(`Up to the allowable increase [${citation.citationId}].`)
    expect(response.tokenUsage).toEqual({ prompt: 900, completion: 120, total: 1020 })
    expect(response.metadata?.["answer"]).toMatchObject({
      requestId,
      lookups: [{ tool: "sf_docs_search_policy", outcome: "succeeded" }],
      citations: [citation]
    })
  })

  it("makes a stream without Complete, or with a server unavailable, an error rather than a failed answer", () => {
    expect(toProviderResponse(foldAnswer([TextChunk.make({ text: "Partial" })])).error).toBe(
      "The stream ended without Complete"
    )
    const unavailable = Complete.make({
      requestId,
      outcome: "answered",
      message: null,
      unavailableServers: ["sf-data"],
      model: { configuration: "local", modelId: "gpt-oss:20b" },
      usage: { inputTokens: 0, outputTokens: 0 }
    })
    expect(toProviderResponse(foldAnswer([unavailable])).error).toBe("Unavailable: sf-data")
  })
})
