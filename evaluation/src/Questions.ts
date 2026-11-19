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

/** A question's ID: its set's prefix, what it asks about, and its number, such as `sf-rent-01` or `ams-data-01`. */
const QuestionId = Schema.String.pipe(
  Schema.check(Schema.isPattern(/^[a-z]{2,3}-[a-z]+-\d{2}$/, { message: "an ID like sf-rent-01 or ams-data-01" }))
)

export const Question = Schema.Struct({
  id: QuestionId,
  type: QuestionType,
  question: Schema.NonEmptyString,
  expect: Expect
})
export type Question = typeof Question.Type

/**
 * One city's questions: the city a run names them by, the prefix every ID in the file starts with, and the questions.
 * The prefix is declared here rather than read off the IDs, so a file whose IDs name another city is an error.
 */
export const QuestionFile = Schema.Struct({
  city: Schema.NonEmptyString,
  prefix: Schema.NonEmptyString,
  questions: Schema.Array(Question)
}).check(
  Schema.makeFilter(({ city, prefix, questions }) => {
    const ids = questions.map((q) => q.id)
    const repeated = ids.filter((id, i) => ids.indexOf(id) !== i)
    if (repeated.length > 0) return `question IDs must be unique: ${repeated.join(", ")}`
    const foreign = ids.filter((id) => !id.startsWith(`${prefix}-`))
    return foreign.length === 0
      ? true
      : `${city}'s questions all start with ${prefix}-, but these do not: ${foreign.join(", ")}`
  })
)
export type QuestionFile = typeof QuestionFile.Type

/** Reads and decodes a question file; anything invalid is a `ConfigFileError` naming the file. */
export const loadQuestions = loadYaml(QuestionFile)
