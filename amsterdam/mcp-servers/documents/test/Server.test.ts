import { fileURLToPath } from "node:url"

import { PgClient } from "@effect/sql-pg"
import { expect, layer } from "@effect/vitest"
import { PostgreSqlContainer } from "@testcontainers/postgresql"
import { Context, Effect, Layer, Redacted, Schema } from "effect"
import { McpProtocol, McpTest } from "effect/ai"

import { QueryEmbedder } from "../src/QueryEmbedder.ts"
import type { Search } from "../src/SearchConfig.ts"
import { SearchConfig } from "../src/SearchConfig.ts"
import { RegistrationsLive } from "../src/Server.ts"

/** PostGIS with pgvector, which the search entries' embeddings need. */
const POSTGIS_IMAGE = "imresamu/postgis:17-3.5-bundle0-bookworm"
const FIXTURE = fileURLToPath(new URL("./fixtures/ams_docs.sql", import.meta.url))
const DIMENSIONS = 2560

const SEARCH: Search = {
  embeddingApi: "https://router.test/api/v1",
  embeddingModel: "qwen/qwen3-embedding-4b",
  embeddingHost: "deepinfra",
  embeddingModelId: "qwen/qwen3-embedding-4b@deepinfra",
  queryInstruction: "Instruct: find the articles\nQuery:"
}

const vector = () => Array<number>(DIMENSIONS).fill(0)

const FakeEmbedder = Layer.succeed(QueryEmbedder, { embed: () => Effect.succeed(vector()) })

class Database extends Context.Service<Database, { readonly url: string }>()("test/Database") {
  static readonly layer = Layer.effect(
    this,
    Effect.gen(function* () {
      const container = yield* Effect.acquireRelease(
        Effect.tryPromise(() =>
          new PostgreSqlContainer(POSTGIS_IMAGE)
            .withCopyFilesToContainer([{ source: FIXTURE, target: "/docker-entrypoint-initdb.d/zz-ams-docs.sql" }])
            .start()
        ),
        (started) => Effect.promise(() => started.stop())
      )
      return { url: container.getConnectionUri() }
    })
  )
}

/** The fixture database's client; layers are shared within one build, so every user gets the same container. */
const PgLive = Layer.unwrap(
  Effect.gen(function* () {
    const { url } = yield* Database
    return PgClient.layer({ url: Redacted.make(url) })
  })
).pipe(Layer.provide(Database.layer))

/** An in-memory MCP client for the server, over the fixture database. */
class TestServer extends Context.Service<TestServer, McpTest.Client>()("test/TestServer") {
  static readonly layer = Layer.effect(
    this,
    McpTest.makeClient(
      RegistrationsLive.pipe(
        Layer.provide(FakeEmbedder),
        Layer.provide(Layer.succeed(SearchConfig, SEARCH)),
        Layer.provide(PgLive)
      ),
      { protocols: [McpProtocol.v2026_07_28] }
    )
  )
}

layer(Layer.merge(TestServer.layer, PgLive), { timeout: 180_000 })("ams-docs server", (it) => {
  it.effect("publishes the three tools with input and output schemas and titles", () =>
    Effect.gen(function* () {
      const { tools } = yield* (yield* TestServer).listTools()
      expect(tools.map((t) => t.name).sort()).toEqual(["get_provision", "list_provisions", "search_policy"])
      for (const tool of tools) {
        expect(tool.outputSchema).toBeDefined()
        expect(tool.annotations?.title).toEqual(expect.any(String))
      }
    })
  )

  it.effect("reports an empty corpus as DataUnavailable", () =>
    Effect.gen(function* () {
      const result = yield* (yield* TestServer).callTool({ name: "search_policy", arguments: { query: "woning" } })
      expect(result.isError).toBe(true)
      const content = Schema.decodeUnknownSync(
        Schema.Tuple([Schema.Struct({ type: Schema.Literal("text"), text: Schema.String })])
      )(result.content)
      expect(content[0].text).toContain("DataUnavailable")
    })
  )
})
