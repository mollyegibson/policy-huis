import { Config, ConfigProvider, Effect, Option } from "effect"
import type { Redacted } from "effect"

import { ConfigFileError } from "./ConfigFile.ts"

/** One node's `.env` file: the configuration provider that reads it, and its required variables. */
export interface DotEnv {
  /**
   * Provides configuration from the `.env` file, which takes priority over the shell, then from the environment,
   * so another project's variables cannot leak in. A missing file leaves the environment alone.
   */
  readonly layer: ReturnType<typeof providerLayer>
  /** A required secret, such as a database URL or an API key. */
  readonly secret: (name: string) => Effect.Effect<Redacted.Redacted, ConfigFileError>
  /** A required port number. */
  readonly port: (name: string) => Effect.Effect<number, ConfigFileError>
}

const providerLayer = (path: string) =>
  ConfigProvider.layer(
    Effect.gen(function* () {
      const env = ConfigProvider.fromEnv()
      const dotEnv = yield* ConfigProvider.fromDotEnv({ path }).pipe(Effect.option)
      return Option.match(dotEnv, { onNone: () => env, onSome: (file) => file.pipe(ConfigProvider.orElse(env)) })
    })
  )

const required =
  (path: string) =>
  <A>(name: string, config: Config.Config<A>): Effect.Effect<A, ConfigFileError> =>
    Effect.mapError(
      config,
      (error) => new ConfigFileError({ path, message: `${name} is missing or invalid: ${error.cause.message}` })
    )

/** The `.env` file at `path`; a missing variable is a `ConfigFileError` naming it and this file. */
export const dotEnv = (path: string): DotEnv => ({
  layer: providerLayer(path),
  secret: (name) => required(path)(name, Config.Redacted(name)),
  port: (name) => required(path)(name, Config.Port(name))
})
