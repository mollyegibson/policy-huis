import { describe, expect, it } from "@effect/vitest"
import { ConfigProvider, Effect, Layer, Redacted } from "effect"

import { DatabaseConfig, HttpConfig } from "../src/SfDataServerConfig.ts"

describe("sf-data configuration", () => {
  it.effect("reads each variable by its name in .env.example", () =>
    Effect.gen(function* () {
      expect(Redacted.value((yield* DatabaseConfig).readerUrl)).toBe("postgresql://reader@db/sf")
      expect((yield* HttpConfig).port).toBe(8081)
    }).pipe(
      Effect.provide(
        Layer.mergeAll(DatabaseConfig.layer, HttpConfig.layer).pipe(
          Layer.provide(
            ConfigProvider.layer(
              ConfigProvider.fromEnvRecord({
                SF_DATA_READER_DATABASE_URL: "postgresql://reader@db/sf",
                SF_DATA_PORT: "8081"
              })
            )
          )
        )
      )
    )
  )
})
