import { describe, expect, it } from "@effect/vitest"
import { Schema } from "effect"

import { OptionalParam } from "../src/Params.ts"

const Params = Schema.Struct({ status: OptionalParam(Schema.String), limit: OptionalParam(Schema.Int) })
const decode = Schema.decodeUnknownSync(Params)

describe("OptionalParam", () => {
  it("decodes null as an absent parameter", () => {
    expect(decode({ status: null, limit: null })).toEqual({})
  })

  it("keeps a given value, and an absent key stays absent", () => {
    expect(decode({ status: "Construction" })).toEqual({ status: "Construction" })
  })

  it("still rejects a value of the wrong type", () => {
    expect(() => decode({ limit: "ten" })).toThrow()
  })

  it("publishes a JSON schema that allows null", () => {
    const document = Schema.toJsonSchemaDocument(Params)
    expect(JSON.stringify(document)).toContain('"null"')
  })
})
