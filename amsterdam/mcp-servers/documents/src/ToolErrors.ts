import { Effect, Schema } from "effect"
import { SqlError } from "effect/sql"

export class UnknownValue extends Schema.TaggedError<UnknownValue>()("UnknownValue", {
  field: Schema.String,
  value: Schema.String,
  validValues: Schema.Array(Schema.String)
}) {}

/** The server could not connect or log in to its database; the same call may succeed later. */
export class DatabaseUnavailable extends Schema.TaggedError<DatabaseUnavailable>()("DatabaseUnavailable", {}) {}

/**
 * The database was reached, but the data a tool reads is not loaded or could not be read. `datasets` names the
 * datasets the tool reads; it is empty for a tool that reads the list of every dataset.
 */
export class DataUnavailable extends Schema.TaggedError<DataUnavailable>()("DataUnavailable", {
  datasets: Schema.Array(Schema.String)
}) {}

/** The errors every tool that reads a database can return to the model. */
export const DataErrors = [DatabaseUnavailable, DataUnavailable] as const

const UNREACHABLE_REASONS: ReadonlySet<string> = new Set(["ConnectionError", "AuthenticationError"])

/**
 * Turns a database failure into the tool error the model reads, logging the cause for whoever runs the server: a
 * failure to connect or log in is `DatabaseUnavailable`; any other query failure, or rows that do not decode, is
 * `DataUnavailable` for `datasets`.
 */
export const toDataError = (datasets: ReadonlyArray<string>) =>
  Effect.fnUntraced(function* (error: SqlError.SqlError | Schema.SchemaError) {
    if (error._tag === "SqlError" && UNREACHABLE_REASONS.has(error.reason._tag)) {
      yield* Effect.logWarning("The database could not be reached", error.reason)
      return yield* new DatabaseUnavailable()
    }
    yield* Effect.logError(`Data for ${datasets.join(", ") || "every dataset"} could not be read`, error)
    return yield* new DataUnavailable({ datasets })
  })

/**
 * Maps the database failures of a tool handler to `DatabaseUnavailable` and `DataUnavailable` for the datasets the
 * call reads, which `datasetsOf` derives from the handler's arguments. Pass it to `Effect.fn` after the handler body.
 */
export const withDataErrors =
  <Args extends ReadonlyArray<unknown>>(datasetsOf: (...args: Args) => ReadonlyArray<string>) =>
  <A, E, R>(
    self: Effect.Effect<A, E | SqlError.SqlError | Schema.SchemaError, R>,
    ...args: Args
  ): Effect.Effect<A, E | DatabaseUnavailable | DataUnavailable, R> =>
    Effect.catch(self, (error): Effect.Effect<never, E | DatabaseUnavailable | DataUnavailable> =>
      SqlError.isSqlError(error) || Schema.isSchemaError(error)
        ? toDataError(datasetsOf(...args))(error)
        : Effect.fail(error)
    )
