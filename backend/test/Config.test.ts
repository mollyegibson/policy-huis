import { describe, expect, it } from "@effect/vitest"
import { Duration, Effect, Layer, Schema } from "effect"
import * as NodeServices from "@effect/platform-node/NodeServices"
import { parse } from "yaml"

import { AGENT_CONFIG_FILE, AgentConfig, AgentConfigFile, loadAgentConfig } from "../src/config/AgentConfig.ts"
import { ConfigFileError, decodeConfig } from "@policyhuis/node-config"
import { loadServerDirectory, SERVER_DIRECTORY_FILE, ServerDirectoryFile } from "../src/config/ServerDirectory.ts"
import { SystemPrompt } from "../src/loop/SystemPrompt.ts"

/** Synthetic values for decoding tests only; they are not the backend's configuration. */
const AGENT_YAML = `
model:
  configuration: frontier
  configurations:
    frontier:
      baseUrl: https://models.example.test/v1
      modelId: test-model
      contextTokens: 1000
      answerTokens: 100
      bytesPerToken: 3.5
      maxConcurrentQuestions: 2
      outputTokensParameter: max_completion_tokens
      requestOptions:
        reasoning_effort: none
loop:
  maxSteps: 4
  stepTimeout: 30 seconds
  requestTimeout: 2 minutes
  modelRetries: 2
  modelRetryBaseDelay: 500 millis
  toolConcurrency: 2
tools:
  callTimeout: 10 seconds
  reconnectBaseDelay: 1 second
  reconnectMaxDelay: 1 minute
api:
  keepaliveInterval: 15 seconds
trace:
  writeTimeout: 5 seconds
prompt:
  file: prompts/system.v1.md
  version: v1
`

const agent = (yaml: string) => decodeConfig(AgentConfigFile)("agent.yaml", parse(yaml))

const servers = (yaml: string) => decodeConfig(ServerDirectoryFile)("servers.yaml", parse(yaml))

const failureMessage = <A>(effect: Effect.Effect<A, ConfigFileError>) =>
  effect.pipe(
    Effect.flip,
    Effect.map((error) => error.message)
  )

describe("agent.yaml", () => {
  it.effect("decodes durations written as text", () =>
    Effect.gen(function* () {
      const config = yield* agent(AGENT_YAML)
      expect(Duration.toMillis(config.loop.stepTimeout)).toBe(30_000)
      expect(Duration.toMillis(config.loop.modelRetryBaseDelay)).toBe(500)
      expect(config.model.configurations.frontier?.modelId).toBe("test-model")
      expect(config.model.configurations.frontier?.requestOptions).toEqual({ reasoning_effort: "none" })
    })
  )

  it.effect("rejects a selected configuration with no entry", () =>
    Effect.gen(function* () {
      const message = yield* failureMessage(
        agent(AGENT_YAML.replace("configuration: frontier", "configuration: local"))
      )
      expect(message).toContain(`No entry under configurations for "local"`)
    })
  )

  it.effect("rejects answer tokens that leave no room for the prompt", () =>
    Effect.gen(function* () {
      const message = yield* failureMessage(agent(AGENT_YAML.replace("answerTokens: 100", "answerTokens: 1000")))
      expect(message).toContain("answerTokens must be less than contextTokens")
    })
  )

  it.effect("rejects a request timeout shorter than a step", () =>
    Effect.gen(function* () {
      const message = yield* failureMessage(
        agent(AGENT_YAML.replace("requestTimeout: 2 minutes", "requestTimeout: 10 seconds"))
      )
      expect(message).toContain("requestTimeout must be at least stepTimeout")
    })
  )

  it.effect("rejects a zero duration and a missing field", () =>
    Effect.gen(function* () {
      expect(
        yield* failureMessage(agent(AGENT_YAML.replace("callTimeout: 10 seconds", "callTimeout: 0 seconds")))
      ).toContain("Expected a duration above zero")
      expect(yield* failureMessage(agent(AGENT_YAML.replace("  maxSteps: 4\n", "")))).toContain("maxSteps")
    })
  )
})

describe("checked-in agent.yaml", () => {
  it.effect("decodes", () =>
    Effect.gen(function* () {
      const config = yield* loadAgentConfig(AGENT_CONFIG_FILE)
      expect(config.model.configurations[config.model.configuration]).toBeDefined()
    }).pipe(Effect.provide(NodeServices.layer))
  )

  it.effect("names a system prompt file that exists", () =>
    Effect.gen(function* () {
      const prompt = yield* SystemPrompt
      expect(prompt.text.length).toBeGreaterThan(0)
    }).pipe(
      Effect.provide(SystemPrompt.layer.pipe(Layer.provide(AgentConfig.layer()))),
      Effect.provide(NodeServices.layer)
    )
  )
})

describe("servers.yaml", () => {
  const entry = (name: string, prefix: string) => `
  - name: ${name}
    label: ${name}
    url: http://localhost:8081/mcp
    prefix: ${prefix}`

  it.effect("rejects two servers with one name or one prefix", () =>
    Effect.gen(function* () {
      const message = yield* failureMessage(
        servers(`servers:${entry("a-data", "a_")}${entry("a-data", "b_")}${entry("c-data", "b_")}`)
      )
      expect(message).toContain(`Two servers are named "a-data"`)
      expect(message).toContain(`Two servers use the tool prefix "b_"`)
    })
  )

  it.effect("rejects a prefix without its trailing underscore, or with an empty word", () =>
    Effect.gen(function* () {
      for (const prefix of ["a", "a__", "_a_", "a_B_"]) {
        const message = yield* failureMessage(servers(`servers:${entry("a-data", prefix)}`))
        expect(message).toContain("each followed by one underscore")
      }
    })
  )

  it.effect("accepts a prefix of several words, such as sf_docs_", () =>
    Effect.gen(function* () {
      const directory = yield* servers(`servers:${entry("a-data", "sf_")}${entry("b-data", "sf_docs_")}`)
      expect(directory.servers.map((s) => s.prefix)).toEqual(["sf_", "sf_docs_"])
    })
  )

  it.effect("decodes the checked-in server directory", () =>
    Effect.gen(function* () {
      const directory = yield* loadServerDirectory(SERVER_DIRECTORY_FILE)
      expect(Schema.is(ServerDirectoryFile)(directory)).toBe(true)
      expect(directory.servers.map((s) => s.name)).toContain("sf-data")
    }).pipe(Effect.provide(NodeServices.layer))
  )
})
