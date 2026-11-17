import { describe, expect, it } from "@effect/vitest"
import { ConfigProvider, Effect, Layer, Redacted } from "effect"

import { DatabaseConfig, HttpConfig } from "../src/AmsDataServerConfig.ts"

describe("ams-data configuration", () => {
  it.effect("reads each variable by its name in .env.example", () =>
    Effect.gen(function* () {
      expect(Redacted.value((yield* DatabaseConfig).readerUrl)).toBe("postgresql://reader@db/nl")
      expect((yield* HttpConfig).port).toBe(8091)
    }).pipe(
      Effect.provide(
        Layer.mergeAll(DatabaseConfig.layer, HttpConfig.layer).pipe(
          Layer.provide(
            ConfigProvider.layer(
              ConfigProvider.fromEnvRecord({
                AMS_DATA_READER_DATABASE_URL: "postgresql://reader@db/nl",
                AMS_DATA_PORT: "8091"
              })
            )
          )
        )
      )
    )
  )
})
