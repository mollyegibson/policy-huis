import { describe, expect, it } from "@effect/vitest"
import { ConfigProvider, Effect, Layer, Redacted } from "effect"

import { DatabaseConfig, HttpConfig, OpenRouterConfig } from "../src/SfDocsServerConfig.ts"

const withEnv = (env: Record<string, string>) =>
  Effect.provide(
    Layer.mergeAll(DatabaseConfig.layer, HttpConfig.layer, OpenRouterConfig.layer).pipe(
      Layer.provide(ConfigProvider.layer(ConfigProvider.fromEnvRecord(env)))
    )
  )

describe("sf-docs configuration", () => {
  it.effect("reads each variable by its name in .env.example", () =>
    Effect.gen(function* () {
      const database = yield* DatabaseConfig
      const http = yield* HttpConfig
      const openRouter = yield* OpenRouterConfig
      expect(Redacted.value(database.readerUrl)).toBe("postgresql://reader@db/sf")
      expect(http.port).toBe(8082)
      expect(Redacted.value(openRouter.apiKey)).toBe("test-key")
    }).pipe(
      withEnv({
        SF_DOCS_READER_DATABASE_URL: "postgresql://reader@db/sf",
        SF_DOCS_PORT: "8082",
        OPENROUTER_API_KEY: "test-key"
      })
    )
  )

  it.effect("requires the OpenRouter key", () =>
    Effect.gen(function* () {
      const error = yield* Layer.build(OpenRouterConfig.layer).pipe(
        Effect.provide(ConfigProvider.layer(ConfigProvider.fromEnvRecord({}))),
        Effect.scoped,
        Effect.flip
      )
      expect(String(error)).toContain("OPENROUTER_API_KEY")
    })
  )
})
