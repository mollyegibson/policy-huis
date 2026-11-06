import { fileURLToPath } from "node:url"

import { drizzle } from "drizzle-orm/node-postgres"
import { migrate } from "drizzle-orm/node-postgres/migrator"
import { Effect, Redacted, Schema } from "effect"
import pg from "pg"

export const MIGRATIONS_FOLDER = fileURLToPath(new URL("../../drizzle", import.meta.url))

export class MigrationFailed extends Schema.TaggedError<MigrationFailed>()("MigrationFailed", {
  message: Schema.String
}) {}

/** Applies the `app` schema's pending Drizzle migrations from `backend/drizzle/`, in order. */
export const runMigrations = Effect.fn("Migrations.run")(function* (databaseUrl: Redacted.Redacted) {
  yield* Effect.acquireUseRelease(
    Effect.sync(() => new pg.Pool({ connectionString: Redacted.value(databaseUrl), max: 1 })),
    (pool) =>
      Effect.tryPromise({
        try: () => migrate(drizzle(pool), { migrationsFolder: MIGRATIONS_FOLDER }),
        catch: (cause) => new MigrationFailed({ message: String(cause) })
      }),
    (pool) => Effect.promise(() => pool.end())
  )
})
