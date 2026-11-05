import { Schema } from "effect"

export const IsoDate = Schema.String.pipe(
  Schema.check(Schema.isPattern(/^\d{4}-\d{2}-\d{2}$/, { message: "a date as YYYY-MM-DD" }))
).annotate({ description: "A date, as YYYY-MM-DD" })
