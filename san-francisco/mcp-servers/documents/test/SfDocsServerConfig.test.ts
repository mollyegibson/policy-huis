import { describe, expect, it } from "@effect/vitest"
import { ConfigProvider, Effect, Layer, Redacted } from "effect"

import { DatabaseConfig, HttpConfig, OllamaConfig } from "../src/SfDocsServerConfig.ts"

const withEnv = (env: Record<string, string>) =>
  Effect.provide(
    Layer.mergeAll(DatabaseConfig.layer, HttpConfig.layer, OllamaConfig.layer).pipe(
      Layer.provide(ConfigProvider.layer(ConfigProvider.fromEnvRecord(env)))
    )
  )

describe("sf-docs configuration", () => {
  it.effect("reads each variable by its name in .env.example", () =>
    Effect.gen(function* () {
      const database = yield* DatabaseConfig
      const http = yield* HttpConfig
      const ollama = yield* OllamaConfig
      expect(Redacted.value(database.readerUrl)).toBe("postgresql://reader@db/sf")
      expect(http.port).toBe(8082)
      expect(ollama.url).toBe("http://ollama:11434")
    }).pipe(
      withEnv({
        SF_DOCS_READER_DATABASE_URL: "postgresql://reader@db/sf",
        SF_DOCS_PORT: "8082",
        OLLAMA_URL: "http://ollama:11434"
      })
    )
  )

  it.effect("defaults Ollama to localhost", () =>
    Effect.gen(function* () {
      expect((yield* OllamaConfig).url).toBe("http://localhost:11434")
    }).pipe(withEnv({ SF_DOCS_READER_DATABASE_URL: "postgresql://reader@db/sf", SF_DOCS_PORT: "8082" }))
  )
})
