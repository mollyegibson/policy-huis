import { describe, expect, it } from "@effect/vitest"
import { ConfigProvider, Effect, Layer, Option, Redacted } from "effect"

import { AppDatabaseConfig, HttpConfig, ModelApiKeysConfig } from "../src/config/BackendConfig.ts"

const withEnv = (env: Record<string, string>) =>
  Effect.provide(
    Layer.mergeAll(AppDatabaseConfig.layer, HttpConfig.layer, ModelApiKeysConfig.layer).pipe(
      Layer.provide(ConfigProvider.layer(ConfigProvider.fromEnvRecord(env)))
    )
  )

describe("backend configuration", () => {
  it.effect("reads each variable by its name in .env.example", () =>
    Effect.gen(function* () {
      expect(Redacted.value((yield* AppDatabaseConfig).url)).toBe("postgresql://owner@db/app")
      expect((yield* HttpConfig).port).toBe(8080)
      const keys = yield* ModelApiKeysConfig
      expect(Option.map(keys.frontier, Redacted.value)).toEqual(Option.some("sk-frontier"))
      expect(Option.map(keys.same_model_cloud, Redacted.value)).toEqual(Option.some("sk-same"))
    }).pipe(
      withEnv({
        APP_DATABASE_URL: "postgresql://owner@db/app",
        BACKEND_PORT: "8080",
        FRONTIER_API_KEY: "sk-frontier",
        SAME_MODEL_CLOUD_API_KEY: "sk-same"
      })
    )
  )

  it.effect("leaves an unset API key empty, for the local configuration", () =>
    Effect.gen(function* () {
      const keys = yield* ModelApiKeysConfig
      expect([Option.isNone(keys.frontier), Option.isNone(keys.same_model_cloud)]).toEqual([true, true])
    }).pipe(withEnv({ APP_DATABASE_URL: "postgresql://owner@db/app", BACKEND_PORT: "8080" }))
  )
})
