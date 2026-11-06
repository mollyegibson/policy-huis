import { Effect, FileSystem, Schema } from "effect"
import { parse } from "yaml"

/**
 * Configuration that is missing or invalid: a YAML file that could not be read, parsed or decoded, a file it names,
 * or a variable missing from a `.env` file. `path` is the file to fix; `message` names the field or variable.
 */
export class ConfigFileError extends Schema.TaggedError<ConfigFileError>()("ConfigFileError", {
  path: Schema.String,
  message: Schema.String
}) {}

/** Reads a file as text, reporting a failure as a `ConfigFileError` for that file. */
export const readConfigText = Effect.fn("ConfigFile.readText")(function* (path: string) {
  const fs = yield* FileSystem.FileSystem
  return yield* fs
    .readFileString(path)
    .pipe(Effect.mapError((error) => new ConfigFileError({ path, message: error.message })))
})

/** Reads a YAML file into an unknown value, for a schema to decode. */
export const readYaml = Effect.fn("ConfigFile.readYaml")(function* (path: string) {
  const text = yield* readConfigText(path)
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

/** Reads and decodes a YAML configuration file. */
export const loadYaml = <A, I>(schema: Schema.Codec<A, I>) =>
  Effect.fn("ConfigFile.loadYaml")(function* (path: string) {
    return yield* decodeConfig(schema)(path, yield* readYaml(path))
  })
