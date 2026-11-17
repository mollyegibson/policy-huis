import { Option, Schema, SchemaTransformation } from "effect"

/**
 * An optional tool parameter that also accepts `null`, which models often send for a parameter they leave unset.
 * The published input schema allows `null`, and `null` decodes as an absent key, so handlers see a value or nothing.
 */
export const OptionalParam = <S extends Schema.Top>(schema: S) =>
  Schema.optionalKey(Schema.NullOr(schema)).pipe(
    Schema.decodeTo(
      Schema.optionalKey(Schema.toType(schema)),
      SchemaTransformation.transformOptional({
        decode: (value) => Option.filter(value, (v): v is S["Type"] => v !== null),
        encode: (value) => value
      })
    )
  )
