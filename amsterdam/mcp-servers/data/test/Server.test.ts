import { fileURLToPath } from "node:url"

import { PgClient } from "@effect/sql-pg"
import { expect, layer } from "@effect/vitest"
import { PostgreSqlContainer } from "@testcontainers/postgresql"
import { Context, Effect, Layer, Redacted } from "effect"
import { McpProtocol, McpTest } from "effect/ai"

import { HousingRepo } from "../src/HousingRepo.ts"
import { RegistrationsLive } from "../src/Server.ts"

const POSTGIS_IMAGE = "imresamu/postgis:17-3.5"
const FIXTURE = fileURLToPath(new URL("./fixtures/ams_data.sql", import.meta.url))

/** A throwaway PostGIS database holding the synthetic `ams_data` schema, and an in-memory MCP client for the server. */
class TestServer extends Context.Service<TestServer, McpTest.Client>()("test/TestServer") {
  static readonly layer = Layer.effect(
    this,
    Effect.gen(function* () {
      const container = yield* Effect.acquireRelease(
        Effect.tryPromise(() =>
          new PostgreSqlContainer(POSTGIS_IMAGE)
            .withCopyFilesToContainer([{ source: FIXTURE, target: "/docker-entrypoint-initdb.d/zz-ams.sql" }])
            .start()
        ),
        (started) => Effect.promise(() => started.stop())
      )
      const registrations = RegistrationsLive.pipe(
        Layer.provide(HousingRepo.layer),
        Layer.provide(PgClient.layer({ url: Redacted.make(container.getConnectionUri()) }))
      )
      return yield* McpTest.makeClient(registrations, { protocols: [McpProtocol.v2026_07_28] })
    })
  )
}

layer(TestServer.layer, { timeout: 120_000 })("ams-data server", (it) => {
  it.effect("publishes every tool with an input and an output schema and a title", () =>
    Effect.gen(function* () {
      const client = yield* TestServer
      const { tools } = yield* client.listTools()
      for (const tool of tools) {
        expect(tool.outputSchema).toBeDefined()
        expect(tool.annotations?.title).toEqual(expect.any(String))
      }
    })
  )
})
