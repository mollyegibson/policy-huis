import { Schema } from "effect"

export class UnknownValue extends Schema.TaggedError<UnknownValue>()("UnknownValue", {
  field: Schema.String,
  value: Schema.String,
  validValues: Schema.Array(Schema.String)
}) {}
