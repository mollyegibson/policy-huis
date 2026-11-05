import { Schema } from "effect"

export { IsoDate } from "@policyhuis/protocol/Formats"

export const YearMonth = Schema.String.pipe(
  Schema.check(Schema.isPattern(/^\d{4}-(0[1-9]|1[0-2])$/, { message: "a month as YYYY-MM" }))
).annotate({ description: "A month, as YYYY-MM" })

export const PositiveInt = Schema.Int.pipe(Schema.check(Schema.isGreaterThan(0)))
export const NonNegativeInt = Schema.Int.pipe(Schema.check(Schema.isGreaterThanOrEqualTo(0)))
