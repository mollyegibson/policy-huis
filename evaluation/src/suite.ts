import { Option, Schema } from "effect"
import type { Assertion, AssertionValueFunction, AssertionValueFunctionContext, TestCase } from "promptfoo"

import { Answer } from "./Answer.ts"
import {
  calledExpectedTool,
  calledWithArguments,
  citationIdsExact,
  citedExpectedProvisions,
  citesNothing,
  completed,
  documentCitationPrefix,
  expectedFacts,
  figuresFromTools,
  mentions,
  citesFigures
} from "./checks.ts"
import type { Verdict } from "./checks.ts"
import type { Question } from "./Questions.ts"

/** The names the checks are reported under, as each assertion's promptfoo `metric`. */
export const CHECKS = [
  "completed",
  "calledExpectedTool",
  "calledWithArguments",
  "citedExpectedDocuments",
  "notCitedDocuments",
  "citedExpectedProvisions",
  "citationIdsExact",
  "citesFigures",
  "figuresFromTools",
  "expectedFacts",
  "mentions",
  "citesNothing"
] as const
export type Check = (typeof CHECKS)[number]

const decodeAnswer = Schema.decodeUnknownOption(Answer)

/** The answer the provider attached to a result, as `metadata.answer`. */
const answerOf = (context: AssertionValueFunctionContext): Option.Option<Answer> =>
  decodeAnswer(context.providerResponse?.metadata?.["answer"])

/** A check of the backend's whole answer, run as a promptfoo `javascript` assertion. */
const answerCheck = (metric: Check, check: (answer: Answer) => Verdict): Assertion => {
  const value: AssertionValueFunction = (_output, context) =>
    Option.match(answerOf(context), {
      onNone: () => ({ pass: false, score: 0, reason: "The result carries no answer from the backend" }),
      onSome: check
    })
  return { type: "javascript", value, metric }
}

/** The promptfoo assertions for one question: four for every question, and the rest from its `expect`. */
export const assertionsFor = (question: Question): ReadonlyArray<Assertion> => {
  const { expect } = question
  const tools = expect.tools ?? []
  const expectedArguments = expect.arguments
  const provisions = expect.provisions
  return [
    answerCheck("completed", completed),
    answerCheck("citationIdsExact", citationIdsExact),
    answerCheck("citesFigures", (answer) => citesFigures(answer, question.question)),
    answerCheck("figuresFromTools", (answer) => figuresFromTools(answer, question.question)),
    ...(tools.length > 0 ? [answerCheck("calledExpectedTool", (answer) => calledExpectedTool(answer, tools))] : []),
    ...(expectedArguments === undefined
      ? []
      : [answerCheck("calledWithArguments", (answer) => calledWithArguments(answer, tools, expectedArguments))]),
    ...(expect.documents ?? []).map((documentId): Assertion => ({
      type: "contains",
      value: `[${documentCitationPrefix(documentId)}`,
      metric: "citedExpectedDocuments"
    })),
    ...(expect.notDocuments ?? []).map((documentId): Assertion => ({
      type: "not-contains",
      value: `[${documentCitationPrefix(documentId)}`,
      metric: "notCitedDocuments"
    })),
    ...(provisions === undefined
      ? []
      : [
          answerCheck("citedExpectedProvisions", (answer) =>
            citedExpectedProvisions(answer, provisions.document, provisions.any)
          )
        ]),
    ...(expect.facts === undefined
      ? []
      : [
          answerCheck("expectedFacts", (answer) =>
            expectedFacts(
              answer,
              (expect.facts ?? []).map((fact) => fact.any)
            )
          )
        ]),
    ...(expect.mentions === undefined
      ? []
      : [answerCheck("mentions", (answer) => mentions(answer, expect.mentions ?? []))]),
    ...(expect.citesNothing === true ? [answerCheck("citesNothing", citesNothing)] : [])
  ]
}

/** One promptfoo test per question; the prompt template is `{{question}}`. */
export const testCaseFor = (question: Question): TestCase => ({
  description: `${question.id}: ${question.question}`,
  vars: { id: question.id, question: question.question },
  assert: [...assertionsFor(question)]
})
