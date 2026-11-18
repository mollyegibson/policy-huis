import { Schema } from "effect"

export const IsoDate = Schema.String.pipe(
  Schema.check(Schema.isPattern(/^\d{4}-\d{2}-\d{2}$/, { message: "a date as YYYY-MM-DD" }))
).annotate({ description: "A date, as YYYY-MM-DD" })

export const YearMonth = Schema.String.pipe(
  Schema.check(Schema.isPattern(/^\d{4}-(0[1-9]|1[0-2])$/, { message: "a month as YYYY-MM" }))
).annotate({ description: "A month as YYYY-MM" })

export const Year = Schema.String.pipe(
  Schema.check(Schema.isPattern(/^\d{4}$/, { message: "a year as YYYY" }))
).annotate({ description: "A year, as YYYY" })

export const Postcode = Schema.String.pipe(
  Schema.check(
    Schema.isPattern(/^[1-9][0-9]{3}[A-Za-z]{2}$/, { message: "a Dutch postcode as four digits and two letters" })
  )
).annotate({ description: "A Dutch postcode, four digits and two letters, as ABC" })

export const PositiveInt = Schema.Int.pipe(Schema.check(Schema.isGreaterThan(0)))
export const NonNegativeInt = Schema.Int.pipe(Schema.check(Schema.isGreaterThanOrEqualTo(0)))
