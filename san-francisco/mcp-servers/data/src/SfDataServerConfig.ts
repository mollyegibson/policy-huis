import { fileURLToPath } from "node:url"

import { Config, Context, Layer } from "effect"
import type { Redacted } from "effect"

import { dotEnv } from "@policyhuis/node-config"

/**
 * `san-francisco/mcp-servers/data/.env`, whose values take priority over the shell's. Every environment variable this
 * server reads is declared in this module, each group read once at startup into its service below.
 */
export const SfDataEnv = dotEnv(fileURLToPath(new URL("../.env", import.meta.url)))

/** The database this server reads. Environment: `SF_DATA_READER_DATABASE_URL`. */
export class DatabaseConfig extends Context.Service<
  DatabaseConfig,
  {
    /** The connection string of the read-only `sf_data_reader` role, which can read only the `sf_data` schema. */
    readonly readerUrl: Redacted.Redacted
  }
>()("sf-data/DatabaseConfig") {
  static readonly layer = Layer.effect(
    this,
    SfDataEnv.load(Config.all({ readerUrl: Config.Redacted("READER_DATABASE_URL") }).pipe(Config.nested("SF_DATA")))
  )
}

/** The HTTP server that serves the MCP endpoint. Environment: `SF_DATA_PORT`. */
export class HttpConfig extends Context.Service<
  HttpConfig,
  {
    /** The port to serve `/mcp` on, which the backend's `config/servers.yaml` names for `sf-data`. */
    readonly port: number
  }
>()("sf-data/HttpConfig") {
  static readonly layer = Layer.effect(
    this,
    SfDataEnv.load(Config.all({ port: Config.Port("PORT") }).pipe(Config.nested("SF_DATA")))
  )
}
