import { describe, expect, it } from "@effect/vitest"
import { Effect, Schema } from "effect"
import { SqlError } from "effect/sql"

import { UnknownValue, withDataErrors } from "../src/ToolErrors.ts"

const sqlError = (reason: SqlError.SqlErrorReason) => new SqlError.SqlError({ reason })

const handler = Effect.fn("handler")(
  function* (error: SqlError.SqlError | Schema.SchemaError | UnknownValue) {
    return yield* Effect.fail(error)
  },
  withDataErrors(() => ["development_pipeline"])
)

const failureOf = (error: SqlError.SqlError | Schema.SchemaError | UnknownValue) => Effect.flip(handler(error))

describe("withDataErrors", () => {
  it.effect("reports a failure to connect or log in as DatabaseUnavailable", () =>
    Effect.gen(function* () {
      const refused = yield* failureOf(sqlError(new SqlError.ConnectionError({ cause: new Error("refused") })))
      const denied = yield* failureOf(sqlError(new SqlError.AuthenticationError({ cause: new Error("denied") })))
      expect(refused._tag).toBe("DatabaseUnavailable")
      expect(denied._tag).toBe("DatabaseUnavailable")
    })
  )

  it.effect("reports any other query failure as DataUnavailable for the tool's datasets", () =>
    Effect.gen(function* () {
      const missing = yield* failureOf(sqlError(new SqlError.SqlSyntaxError({ cause: new Error("no relation") })))
      expect(missing).toMatchObject({ _tag: "DataUnavailable", datasets: ["development_pipeline"] })
    })
  )

  it.effect("reports rows that do not decode as DataUnavailable", () =>
    Effect.gen(function* () {
      const decodeError = yield* Effect.flip(Schema.decodeUnknownEffect(Schema.Int)("x"))
      const failure = yield* failureOf(decodeError)
      expect(failure).toMatchObject({ _tag: "DataUnavailable", datasets: ["development_pipeline"] })
    })
  )

  it.effect("passes other tool errors through", () =>
    Effect.gen(function* () {
      const failure = yield* failureOf(new UnknownValue({ field: "status", value: "x", validValues: ["a"] }))
      expect(failure._tag).toBe("UnknownValue")
    })
  )
})
