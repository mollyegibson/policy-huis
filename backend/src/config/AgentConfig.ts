import { fileURLToPath } from "node:url"

import { Context, Duration, Effect, Layer, Schema } from "effect"

import { ConfigFileError, loadYaml } from "@policyhuis/node-config"

import { HttpUrl } from "./HttpUrl.ts"

export const AGENT_CONFIG_FILE = fileURLToPath(new URL("../../config/agent.yaml", import.meta.url))

const PositiveInt = Schema.Int.pipe(Schema.check(Schema.isGreaterThan(0, { message: "Expected an integer above 0" })))
const NonNegativeInt = Schema.Int.pipe(
  Schema.check(Schema.isGreaterThanOrEqualTo(0, { message: "Expected an integer of 0 or more" }))
)
const PositiveNumber = Schema.Finite.pipe(
  Schema.check(Schema.isGreaterThan(0, { message: "Expected a number above 0" }))
)

/** A duration written as text, such as "30 seconds"; zero and negative durations are rejected. */
const PositiveDuration = Schema.DurationFromString.pipe(
  Schema.check(
    Schema.makeFilter((duration: Duration.Duration) =>
      Duration.isGreaterThan(duration, Duration.zero) ? true : "Expected a duration above zero"
    )
  )
)

/** The model configurations named in the Ubiquitous Language: Local, Same model in the cloud, Frontier. */
export const ModelConfigurationKey = Schema.Literals(["local", "same_model_cloud", "frontier"])
export type ModelConfigurationKey = typeof ModelConfigurationKey.Type

/**
 * One model configuration: where the model is served and the limits that depend on the model. `answerTokens` is the
 * output cap sent with every model turn and is reserved from `contextTokens`; `bytesPerToken` converts tool results'
 * bytes into estimated tokens for the model's tokenizer; `maxConcurrentQuestions` is how many questions the model's
 * runtime or provider answers at once.
 * `outputTokensParameter` names the request field that carries `answerTokens`: `max_tokens` when omitted, which local
 * runtimes accept, or `max_completion_tokens` for OpenAI models that reject `max_tokens`. `requestOptions` are extra fields sent unchanged in every
 * request body to this model, for settings its server needs, such as `reasoning_effort`.
 */
export const ModelEndpoint = Schema.Struct({
  baseUrl: HttpUrl,
  modelId: Schema.NonEmptyString,
  contextTokens: PositiveInt,
  answerTokens: PositiveInt,
  bytesPerToken: PositiveNumber,
  maxConcurrentQuestions: PositiveInt,
  outputTokensParameter: Schema.optionalKey(Schema.Literals(["max_tokens", "max_completion_tokens"])),
  requestOptions: Schema.optionalKey(
    Schema.Record(Schema.NonEmptyString, Schema.Union([Schema.String, Schema.Finite, Schema.Boolean]))
  )
}).pipe(
  Schema.check(
    Schema.makeFilter((endpoint) =>
      endpoint.answerTokens >= endpoint.contextTokens
        ? { path: ["answerTokens"], issue: "answerTokens must be less than contextTokens" }
        : true
    )
  )
)
export type ModelEndpoint = typeof ModelEndpoint.Type

const ModelSection = Schema.Struct({
  configuration: ModelConfigurationKey,
  configurations: Schema.Struct({
    local: Schema.optionalKey(ModelEndpoint),
    same_model_cloud: Schema.optionalKey(ModelEndpoint),
    frontier: Schema.optionalKey(ModelEndpoint)
  })
}).pipe(
  Schema.check(
    Schema.makeFilter((model) =>
      model.configurations[model.configuration] === undefined
        ? { path: ["configuration"], issue: `No entry under configurations for "${model.configuration}"` }
        : true
    )
  )
)

const LoopSection = Schema.Struct({
  maxSteps: PositiveInt,
  stepTimeout: PositiveDuration,
  requestTimeout: PositiveDuration,
  modelRetries: NonNegativeInt,
  modelRetryBaseDelay: PositiveDuration,
  toolConcurrency: PositiveInt
}).pipe(
  Schema.check(
    Schema.makeFilter((loop) =>
      Duration.isLessThan(loop.requestTimeout, loop.stepTimeout)
        ? { path: ["requestTimeout"], issue: "requestTimeout must be at least stepTimeout" }
        : true
    )
  )
)

const ToolsSection = Schema.Struct({
  callTimeout: PositiveDuration,
  reconnectBaseDelay: PositiveDuration,
  reconnectMaxDelay: PositiveDuration
})

const ApiSection = Schema.Struct({
  keepaliveInterval: PositiveDuration
})

const TraceSection = Schema.Struct({
  writeTimeout: PositiveDuration
})

const PromptSection = Schema.Struct({
  file: Schema.NonEmptyString,
  version: Schema.NonEmptyString
})

/** `backend/config/agent.yaml`: the backend's declared choices. Secrets are never here; they live in `backend/.env`. */
export const AgentConfigFile = Schema.Struct({
  model: ModelSection,
  loop: LoopSection,
  tools: ToolsSection,
  api: ApiSection,
  trace: TraceSection,
  prompt: PromptSection
})
export type AgentConfigFile = typeof AgentConfigFile.Type

export const loadAgentConfig = loadYaml(AgentConfigFile)

export class AgentConfig extends Context.Service<AgentConfig, AgentConfigFile>()("backend/AgentConfig") {
  static readonly layer = (path: string = AGENT_CONFIG_FILE) => Layer.effect(this, loadAgentConfig(path))
}

/**
 * The selected model configuration's key and endpoint. The schema already rejects a selection with no entry; this
 * reports one the same way if the config was built some other way.
 */
export const activeModel = (config: AgentConfigFile) => {
  const key = config.model.configuration
  const endpoint = config.model.configurations[key]
  return endpoint === undefined
    ? Effect.fail(
        new ConfigFileError({ path: AGENT_CONFIG_FILE, message: `No entry under configurations for "${key}"` })
      )
    : Effect.succeed({ key, endpoint })
}
