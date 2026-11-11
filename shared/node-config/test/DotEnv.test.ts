import { mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import * as NodeServices from "@effect/platform-node/NodeServices"
import { describe, expect, it } from "@effect/vitest"
import { Config, Effect, Layer, Redacted, Schema } from "effect"

import { ConfigFileError, loadYaml } from "../src/ConfigFile.ts"
import { dotEnv } from "../src/DotEnv.ts"

const tempFile = (name: string, contents: string) => {
  const path = join(mkdtempSync(join(tmpdir(), "node-config-")), name)
  writeFileSync(path, contents)
  return path
}

const withEnv = (env: ReturnType<typeof dotEnv>) => Effect.provide(env.layer.pipe(Layer.provide(NodeServices.layer)))

describe("dotEnv", () => {
  it.effect("reads a group of variables, nested under a prefix, from the .env file", () =>
    Effect.gen(function* () {
      const env = dotEnv(tempFile(".env", "POLICYHUIS_TEST_URL=postgresql://x\nPOLICYHUIS_TEST_PORT=8081\n"))
      const group = Config.all({ url: Config.Redacted("URL"), port: Config.Port("PORT") }).pipe(
        Config.nested("POLICYHUIS_TEST")
      )
      const { url, port } = yield* env.load(group).pipe(withEnv(env))
      expect(Redacted.value(url)).toBe("postgresql://x")
      expect(port).toBe(8081)
    })
  )

  it.effect("reports a missing variable as a ConfigFileError naming it and the .env file", () =>
    Effect.gen(function* () {
      const path = tempFile(".env", "")
      const env = dotEnv(path)
      const error = yield* Effect.flip(env.load(Config.Redacted("POLICYHUIS_TEST_MISSING")).pipe(withEnv(env)))
      expect(error).toBeInstanceOf(ConfigFileError)
      expect(error.path).toBe(path)
      expect(error.message).toContain("POLICYHUIS_TEST_MISSING")
    })
  )
})

describe("loadYaml", () => {
  it.effect("decodes a YAML file, or names the file and field that failed", () =>
    Effect.gen(function* () {
      const load = loadYaml(Schema.Struct({ port: Schema.Int }))
      const good = yield* load(tempFile("ok.yaml", "port: 8081\n"))
      expect(good.port).toBe(8081)
      const bad = tempFile("bad.yaml", "port: eighty\n")
      const error = yield* Effect.flip(load(bad))
      expect(error.path).toBe(bad)
      expect(error.message).toContain("port")
    }).pipe(Effect.provide(NodeServices.layer))
  )
})
