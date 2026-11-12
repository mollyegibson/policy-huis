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

/** The limits every model configuration declares, which depend on the model. */
const ModelLimits = {
  /** The model's context length, or less; the budget each question's prompt is held to. */
  contextTokens: PositiveInt,
  /** The output cap sent with every model turn, reserved from `contextTokens`; for a reasoning model it includes reasoning. */
  answerTokens: PositiveInt,
  /** Converts tool results' bytes into estimated tokens for the model's tokenizer. */
  bytesPerToken: PositiveNumber,
  /** How many questions the model's runtime or provider answers at once. */
  maxConcurrentQuestions: PositiveInt
}

const answerTokensBelowContext = Schema.makeFilter((endpoint: { answerTokens: number; contextTokens: number }) =>
  endpoint.answerTokens >= endpoint.contextTokens
    ? { path: ["answerTokens"], issue: "answerTokens must be less than contextTokens" }
    : true
)

/**
 * A model served through OpenAI's Chat Completions API (a local runtime, or a cloud provider that imitates it), through
 * `@effect/ai-openai-compat`. `outputTokensParameter` names the request field that carries `answerTokens`: `max_tokens`
 * when omitted, which local runtimes accept, or `max_completion_tokens` for OpenAI models that reject `max_tokens`.
 * `requestOptions` are extra fields sent unchanged in every request body, for settings the server needs, such as
 * `reasoning_effort`.
 */
export const OpenAiCompatEndpoint = Schema.Struct({
  provider: Schema.Literal("openai-compat"),
  label: Schema.NonEmptyString,
  baseUrl: HttpUrl,
  modelId: Schema.NonEmptyString,
  ...ModelLimits,
  outputTokensParameter: Schema.optionalKey(Schema.Literals(["max_tokens", "max_completion_tokens"])),
  requestOptions: Schema.optionalKey(
    Schema.Record(Schema.NonEmptyString, Schema.Union([Schema.String, Schema.Finite, Schema.Boolean]))
  )
}).pipe(Schema.check(answerTokensBelowContext))

/**
 * A Claude model, through Anthropic's Messages API and `@effect/ai-anthropic`. Claude thinks on every turn; `effort`
 * is how much, and is sent as `output_config.effort`.
 */
export const AnthropicEndpoint = Schema.Struct({
  provider: Schema.Literal("anthropic"),
  label: Schema.NonEmptyString,
  modelId: Schema.NonEmptyString,
  effort: Schema.Literals(["low", "medium", "high"]),
  ...ModelLimits
}).pipe(Schema.check(answerTokensBelowContext))

/** One model configuration: its provider, the label the browser app shows for it, its model and its limits. */
export const ModelEndpoint = Schema.Union([OpenAiCompatEndpoint, AnthropicEndpoint])
export type ModelEndpoint = typeof ModelEndpoint.Type

/** The settings a trace records with each question, beyond the model ID, so a change of effort shows in the traces. */
export const modelSettings = (endpoint: ModelEndpoint): Readonly<Record<string, unknown>> =>
  endpoint.provider === "anthropic" ? { effort: endpoint.effort } : { ...endpoint.requestOptions }

const ModelSection = Schema.Struct({
  /** The configuration that answers a question that names none. */
  default: ModelConfigurationKey,
  /** The configurations a question may name; each needs its API key in `backend/.env`, except `local`. */
  offered: Schema.NonEmptyArray(ModelConfigurationKey),
  configurations: Schema.Struct({
    local: Schema.optionalKey(ModelEndpoint),
    same_model_cloud: Schema.optionalKey(ModelEndpoint),
    frontier: Schema.optionalKey(ModelEndpoint)
  })
}).pipe(
  Schema.check(
    Schema.makeFilter((model) => {
      const missing = model.offered.find((key) => model.configurations[key] === undefined)
      if (missing !== undefined) return { path: ["offered"], issue: `No entry under configurations for "${missing}"` }
      if (new Set(model.offered).size !== model.offered.length) {
        return { path: ["offered"], issue: "A configuration is offered twice" }
      }
      return model.offered.includes(model.default)
        ? true
        : { path: ["default"], issue: `The default "${model.default}" is not offered` }
    })
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

/** An offered model configuration: its key and its entry. */
export interface OfferedModel {
  readonly key: ModelConfigurationKey
  readonly endpoint: ModelEndpoint
}

/**
 * The offered model configurations, in the order `offered` lists them. The schema already rejects an offered
 * configuration with no entry; this reports one the same way if the config was built some other way.
 */
export const offeredModels = (config: AgentConfigFile): Effect.Effect<ReadonlyArray<OfferedModel>, ConfigFileError> =>
  Effect.forEach(config.model.offered, (key) => {
    const endpoint = config.model.configurations[key]
    return endpoint === undefined
      ? Effect.fail(
          new ConfigFileError({ path: AGENT_CONFIG_FILE, message: `No entry under configurations for "${key}"` })
        )
      : Effect.succeed({ key, endpoint })
  })
