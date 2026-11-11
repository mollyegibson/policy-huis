import { ConfigProvider, Effect, Option } from "effect"
import type { Config } from "effect"

import { ConfigFileError } from "./ConfigFile.ts"

/**
 * One node's `.env` file. A node declares every variable it reads as a typed `Config` in its own configuration
 * module, and reads each group with `load`; nothing else reads the environment by name.
 */
export interface DotEnv {
  /**
   * Provides configuration from the `.env` file, which takes priority over the shell, then from the environment,
   * so another project's variables cannot leak in. A missing file leaves the environment alone.
   */
  readonly layer: ReturnType<typeof providerLayer>
  /** Reads `config`; a missing or invalid variable is a `ConfigFileError` naming it and this file. */
  readonly load: <A>(config: Config.Config<A>) => Effect.Effect<A, ConfigFileError>
}

const providerLayer = (path: string) =>
  ConfigProvider.layer(
    Effect.gen(function* () {
      const env = ConfigProvider.fromEnv()
      const dotEnv = yield* ConfigProvider.fromDotEnv({ path }).pipe(Effect.option)
      return Option.match(dotEnv, { onNone: () => env, onSome: (file) => file.pipe(ConfigProvider.orElse(env)) })
    })
  )

/** The `.env` file at `path`. */
export const dotEnv = (path: string): DotEnv => ({
  layer: providerLayer(path),
  load: (config) =>
    Effect.mapError(config, (error) => new ConfigFileError({ path, message: `missing or invalid: ${error.message}` }))
})
