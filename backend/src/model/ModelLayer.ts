import { AnthropicClient, AnthropicLanguageModel } from "@effect/ai-anthropic"
import { OpenAiClient, OpenAiLanguageModel } from "@effect/ai-openai-compat"
import { Context, Effect, Layer, Option, Semaphore } from "effect"
import type { Redacted } from "effect"
import { LanguageModel } from "effect/ai"
import type { HttpClient } from "effect/http"

import { ConfigFileError } from "@policyhuis/node-config"

import type { ModelConfigurationKey, ModelEndpoint } from "../config/AgentConfig.ts"
import { AgentConfig, offeredModels } from "../config/AgentConfig.ts"
import { BACKEND_ENV_FILE, ModelApiKeysConfig } from "../config/BackendConfig.ts"

/** An offered model configuration, ready to answer: its entry, its `LanguageModel`, and the permits that admit its questions. */
export interface AvailableModel {
  readonly key: ModelConfigurationKey
  readonly endpoint: ModelEndpoint
  readonly model: LanguageModel.LanguageModel
  /** Sized `maxConcurrentQuestions`: one permit per question this configuration is answering. */
  readonly permits: Semaphore.Semaphore
}

/**
 * The `LanguageModel` for one configuration, through its provider's package. An `openai-compat` configuration sends
 * the output cap under its `outputTokensParameter`, alongside its `requestOptions`; an `anthropic` one sends the cap
 * as `max_tokens` and its effort as `output_config.effort`.
 */
const languageModel = (
  endpoint: ModelEndpoint,
  apiKey: Redacted.Redacted | undefined
): Layer.Layer<LanguageModel.LanguageModel, never, HttpClient.HttpClient> => {
  switch (endpoint.provider) {
    case "openai-compat":
      return OpenAiLanguageModel.layer({
        model: endpoint.modelId,
        config: {
          ...endpoint.requestOptions,
          [endpoint.outputTokensParameter ?? "max_tokens"]: endpoint.answerTokens
        }
      }).pipe(Layer.provide(OpenAiClient.layer({ apiUrl: endpoint.baseUrl, apiKey })))
    case "anthropic":
      return AnthropicLanguageModel.layer({
        model: endpoint.modelId,
        config: { max_tokens: endpoint.answerTokens, output_config: { effort: endpoint.effort } }
      }).pipe(Layer.provide(AnthropicClient.layer({ apiKey })))
  }
}

/**
 * Every offered model configuration, built once at startup; the only module that imports a provider package. A cloud
 * configuration's API key comes from `ModelApiKeysConfig`, and a missing one stops the backend at startup; the local
 * configuration needs none.
 */
export class Models extends Context.Service<
  Models,
  {
    readonly default: AvailableModel
    /** The offered configurations, in the order `agent.yaml` lists them. */
    readonly offered: ReadonlyArray<AvailableModel>
    readonly find: (key: string) => Option.Option<AvailableModel>
  }
>()("backend/Models") {
  static readonly layer = Layer.effect(
    this,
    Effect.gen(function* () {
      const config = yield* AgentConfig
      const keys = yield* ModelApiKeysConfig
      const offered = yield* Effect.forEach(
        yield* offeredModels(config),
        Effect.fnUntraced(function* ({ key, endpoint }) {
          const apiKey =
            key === "local"
              ? undefined
              : yield* Option.match(keys[key], {
                  onNone: () =>
                    Effect.fail(
                      new ConfigFileError({
                        path: BACKEND_ENV_FILE,
                        message: `${key.toUpperCase()}_API_KEY is missing; agent.yaml offers the ${key} model configuration`
                      })
                    ),
                  onSome: Effect.succeed
                })
          const built = yield* Layer.build(languageModel(endpoint, apiKey))
          return {
            key,
            endpoint,
            model: Context.get(built, LanguageModel.LanguageModel),
            permits: yield* Semaphore.make(endpoint.maxConcurrentQuestions)
          }
        })
      )
      const byKey = new Map<string, AvailableModel>(offered.map((available) => [available.key, available]))
      const fallback = byKey.get(config.model.default)
      if (fallback === undefined) {
        return yield* new ConfigFileError({
          path: BACKEND_ENV_FILE,
          message: `The default model configuration "${config.model.default}" is not offered`
        })
      }
      return { default: fallback, offered, find: (key: string) => Option.fromNullishOr(byKey.get(key)) }
    })
  )
}
