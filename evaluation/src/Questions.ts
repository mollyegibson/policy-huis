import { Schema } from "effect"

import { loadYaml } from "@policyhuis/node-config"

const Words = Schema.NonEmptyArray(Schema.NonEmptyString)

/** A fact the answer must state, in any of its forms, copied from the archived source that `source` names. */
export const Fact = Schema.Struct({
  any: Words,
  source: Schema.NonEmptyString
})
export type Fact = typeof Fact.Type

/** What a question's answer is checked for; each field adds its checks, and an absent field adds none. */
export const Expect = Schema.Struct({
  tools: Schema.optional(Words).annotate({ description: "At least one of these tools is called" }),
  arguments: Schema.optional(Schema.Record(Schema.String, Schema.String)).annotate({
    description: "Some call of an expected tool has each of these arguments, compared without case"
  }),
  documents: Schema.optional(Words).annotate({ description: "The answer cites a passage of each document" }),
  notDocuments: Schema.optional(Words).annotate({ description: "The answer cites no passage of these documents" }),
  provisions: Schema.optional(Schema.Struct({ document: Schema.NonEmptyString, any: Words })).annotate({
    description: "The answer cites one of these provisions of the document, or a subsection of one"
  }),
  facts: Schema.optional(Schema.Array(Fact)),
  mentions: Schema.optional(Words).annotate({ description: "At least one of these appears, without case" }),
  citesNothing: Schema.optional(Schema.Boolean).annotate({ description: "The answer contains no citation" })
})
export type Expect = typeof Expect.Type

export const QuestionType = Schema.Literals(["rule", "ground", "rule + data", "climate", "report", "decline"])

export const Question = Schema.Struct({
  id: Schema.String.pipe(Schema.check(Schema.isPattern(/^sf-[a-z]+-\d{2}$/, { message: "an ID like sf-rent-01" }))),
  type: QuestionType,
  question: Schema.NonEmptyString,
  expect: Expect
})
export type Question = typeof Question.Type

export const QuestionFile = Schema.Struct({ questions: Schema.Array(Question) }).check(
  Schema.makeFilter(({ questions }) => {
    const ids = questions.map((q) => q.id)
    const repeated = ids.filter((id, i) => ids.indexOf(id) !== i)
    return repeated.length === 0 ? true : `question IDs must be unique: ${repeated.join(", ")}`
  })
)
export type QuestionFile = typeof QuestionFile.Type

/** Reads and decodes a question file; anything invalid is a `ConfigFileError` naming the file. */
export const loadQuestions = loadYaml(QuestionFile)
