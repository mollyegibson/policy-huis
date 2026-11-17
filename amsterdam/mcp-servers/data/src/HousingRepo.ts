import { Context, Effect, Layer } from "effect"
import { SqlClient } from "effect/sql"

/**
 * Read-only queries over the `ams_data` schema that the Amsterdam ingestion project builds. Every row is decoded
 * with a schema. A query is added with the tool that reads it, and the tool's handler validates its inputs against
 * the loaded reference tables.
 */
export class HousingRepo extends Context.Service<HousingRepo>()("HousingRepo", {
  make: Effect.gen(function* () {
    yield* SqlClient.SqlClient
    return {} as const
  })
}) {
  static readonly layer = Layer.effect(this, this.make)
}
