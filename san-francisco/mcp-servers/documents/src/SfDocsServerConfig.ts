import { fileURLToPath } from "node:url"

import { Config, Context, Layer } from "effect"
import type { Redacted } from "effect"

import { dotEnv } from "@policyhuis/node-config"

/**
 * `san-francisco/mcp-servers/documents/.env`, whose values take priority over the shell's. Every environment variable
 * this server reads is declared in this module, each group read once at startup into its service below.
 */
export const SfDocsEnv = dotEnv(fileURLToPath(new URL("../.env", import.meta.url)))

/** The database this server reads. Environment: `SF_DOCS_READER_DATABASE_URL`. */
export class DatabaseConfig extends Context.Service<
  DatabaseConfig,
  {
    /** The connection string of the read-only `sf_docs_reader` role, which can read only the `sf_docs` schema. */
    readonly readerUrl: Redacted.Redacted
  }
>()("sf-docs/DatabaseConfig") {
  static readonly layer = Layer.effect(
    this,
    SfDocsEnv.load(Config.all({ readerUrl: Config.Redacted("READER_DATABASE_URL") }).pipe(Config.nested("SF_DOCS")))
  )
}

/** The HTTP server that serves the MCP endpoint. Environment: `SF_DOCS_PORT`. */
export class HttpConfig extends Context.Service<
  HttpConfig,
  {
    /** The port to serve `/mcp` on, which the backend's `config/servers.yaml` names for `sf-docs`. */
    readonly port: number
  }
>()("sf-docs/HttpConfig") {
  static readonly layer = Layer.effect(
    this,
    SfDocsEnv.load(Config.all({ port: Config.Port("PORT") }).pipe(Config.nested("SF_DOCS")))
  )
}

/**
 * OpenRouter, which embeds search queries with the model and host in `config/search.yaml`. Environment:
 * `OPENROUTER_API_KEY`, not namespaced, since the documents ingestion reads the same variable for the same API.
 */
export class OpenRouterConfig extends Context.Service<
  OpenRouterConfig,
  {
    readonly apiKey: Redacted.Redacted
  }
>()("sf-docs/OpenRouterConfig") {
  static readonly layer = Layer.effect(
    this,
    SfDocsEnv.load(Config.all({ apiKey: Config.Redacted("OPENROUTER_API_KEY") }))
  )
}
