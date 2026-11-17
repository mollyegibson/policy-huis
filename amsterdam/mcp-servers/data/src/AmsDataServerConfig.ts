import { fileURLToPath } from "node:url"

import { Config, Context, Layer } from "effect"
import type { Redacted } from "effect"

import { dotEnv } from "@policyhuis/node-config"

/**
 * `amsterdam/mcp-servers/data/.env`, whose values take priority over the shell's. Every environment variable this
 * server reads is declared in this module, each group read once at startup into its service below.
 */
export const AmsDataEnv = dotEnv(fileURLToPath(new URL("../.env", import.meta.url)))

/** The database this server reads. Environment: `AMS_DATA_READER_DATABASE_URL`. */
export class DatabaseConfig extends Context.Service<
  DatabaseConfig,
  {
    /** The connection string of the read-only `ams_data_reader` role, which can read only the `ams_data` schema. */
    readonly readerUrl: Redacted.Redacted
  }
>()("ams-data/DatabaseConfig") {
  static readonly layer = Layer.effect(
    this,
    AmsDataEnv.load(Config.all({ readerUrl: Config.Redacted("READER_DATABASE_URL") }).pipe(Config.nested("AMS_DATA")))
  )
}

/** The HTTP server that serves the MCP endpoint. Environment: `AMS_DATA_PORT`. */
export class HttpConfig extends Context.Service<
  HttpConfig,
  {
    /** The port to serve `/mcp` on, which the backend's `config/servers.yaml` names for `ams-data`. */
    readonly port: number
  }
>()("ams-data/HttpConfig") {
  static readonly layer = Layer.effect(
    this,
    AmsDataEnv.load(Config.all({ port: Config.Port("PORT") }).pipe(Config.nested("AMS_DATA")))
  )
}
