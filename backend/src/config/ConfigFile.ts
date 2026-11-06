import { Effect, FileSystem, Schema } from "effect"
import { parse } from "yaml"

/** An absolute http or https URL. */
export const HttpUrl = Schema.NonEmptyString.pipe(
  Schema.check(
    Schema.makeFilter((url: string) =>
      URL.canParse(url) && /^https?:$/.test(new URL(url).protocol) ? true : "Expected an http or https URL"
    )
  )
)

/** A configuration file that could not be read, parsed or decoded; `message` names the field that failed. */
export class ConfigFileError extends Schema.TaggedError<ConfigFileError>()("ConfigFileError", {
  path: Schema.String,
  message: Schema.String
}) {}

/** Reads a YAML file into an unknown value, for a schema to decode. */
export const readYaml = Effect.fn("ConfigFile.readYaml")(function* (path: string) {
  const fs = yield* FileSystem.FileSystem
  const text = yield* fs
    .readFileString(path)
    .pipe(Effect.mapError((error) => new ConfigFileError({ path, message: error.message })))
  return yield* Effect.try({
    try: (): unknown => parse(text),
    catch: (error) => new ConfigFileError({ path, message: String(error) })
  })
})

/** Decodes a parsed configuration file, reporting a schema failure as a `ConfigFileError` for that file. */
export const decodeConfig =
  <A, I>(schema: Schema.Codec<A, I>) =>
  (path: string, input: unknown): Effect.Effect<A, ConfigFileError> =>
    Schema.decodeUnknownEffect(schema)(input).pipe(
      Effect.mapError((error) => new ConfigFileError({ path, message: error.message }))
    )
