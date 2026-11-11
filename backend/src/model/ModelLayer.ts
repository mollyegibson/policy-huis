import { OpenAiClient, OpenAiLanguageModel } from "@effect/ai-openai-compat"
import { Effect, Layer, Option } from "effect"

import { ConfigFileError } from "@policyhuis/node-config"

import { activeModel, AgentConfig } from "../config/AgentConfig.ts"
import { BACKEND_ENV_FILE, ModelApiKeysConfig } from "../config/BackendConfig.ts"

/**
 * The `LanguageModel` for the configured model configuration, through `@effect/ai-openai-compat`; the only module
 * that imports a provider package. A cloud configuration's API key comes from `ModelApiKeysConfig`, and a missing one stops
 * the backend at startup; the local configuration needs none. The output cap is sent under the configuration's
 * `outputTokensParameter`, alongside its `requestOptions`.
 */
export const ModelLayer = Layer.unwrap(
  Effect.gen(function* () {
    const config = yield* AgentConfig
    const { key, endpoint } = yield* activeModel(config)
    const keys = yield* ModelApiKeysConfig
    const apiKey =
      key === "local"
        ? undefined
        : yield* Option.match(keys[key], {
            onNone: () =>
              Effect.fail(
                new ConfigFileError({
                  path: BACKEND_ENV_FILE,
                  message: `${key.toUpperCase()}_API_KEY is missing; the ${key} model configuration needs it`
                })
              ),
            onSome: Effect.succeed
          })
    return OpenAiLanguageModel.layer({
      model: endpoint.modelId,
      config: {
        ...endpoint.requestOptions,
        [endpoint.outputTokensParameter ?? "max_tokens"]: endpoint.answerTokens
      }
    }).pipe(Layer.provide(OpenAiClient.layer({ apiUrl: endpoint.baseUrl, apiKey })))
  })
)
