import { fileURLToPath } from "node:url"

import { Config, Context, Layer } from "effect"
import type { Option, Redacted } from "effect"

import { dotEnv } from "@policyhuis/node-config"

export const BACKEND_ENV_FILE = fileURLToPath(new URL("../../.env", import.meta.url))

/**
 * `backend/.env`, whose values take priority over the shell's. Every environment variable the backend reads is declared
 * in this module, each group read once at startup into its service below. Settings that are not secrets or
 * per-machine values live in `config/agent.yaml` and `config/servers.yaml` instead.
 */
export const BackendEnv = dotEnv(BACKEND_ENV_FILE)

/** The `app` database, which holds the traces. Environment: `APP_DATABASE_URL`. */
export class AppDatabaseConfig extends Context.Service<
  AppDatabaseConfig,
  {
    /** The owner connection string of the `app` Neon project; the backend applies its migrations at startup. */
    readonly url: Redacted.Redacted
  }
>()("backend/AppDatabaseConfig") {
  static readonly layer = Layer.effect(
    this,
    BackendEnv.load(Config.all({ url: Config.Redacted("DATABASE_URL") }).pipe(Config.nested("APP")))
  )
}

/** The HTTP server that serves the question API. Environment: `BACKEND_PORT`. */
export class HttpConfig extends Context.Service<
  HttpConfig,
  {
    /** The port to serve the question API on, which the browser app's `BACKEND_URL` names. */
    readonly port: number
  }
>()("backend/HttpConfig") {
  static readonly layer = Layer.effect(
    this,
    BackendEnv.load(Config.all({ port: Config.Port("PORT") }).pipe(Config.nested("BACKEND")))
  )
}

/**
 * The API key of each cloud model configuration, by its key in `config/agent.yaml`. Environment: `FRONTIER_API_KEY`
 * and `SAME_MODEL_CLOUD_API_KEY`, each optional here: only the configurations `agent.yaml` offers need their keys, and
 * the model layer fails at startup when one is missing. The `local` configuration needs none.
 */
export class ModelApiKeysConfig extends Context.Service<
  ModelApiKeysConfig,
  {
    readonly frontier: Option.Option<Redacted.Redacted>
    readonly same_model_cloud: Option.Option<Redacted.Redacted>
  }
>()("backend/ModelApiKeysConfig") {
  static readonly layer = Layer.effect(
    this,
    BackendEnv.load(
      Config.all({
        frontier: Config.option(Config.Redacted("FRONTIER_API_KEY")),
        same_model_cloud: Config.option(Config.Redacted("SAME_MODEL_CLOUD_API_KEY"))
      })
    )
  )
}
