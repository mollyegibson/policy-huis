import { OpenAiClient, OpenAiLanguageModel } from "@effect/ai-openai-compat"
import { Config, Effect, Layer } from "effect"

import { activeModel, AgentConfig } from "../config/AgentConfig.ts"

/**
 * The `LanguageModel` for the configured model configuration, through `@effect/ai-openai-compat`; the only module
 * that imports a provider package. A cloud configuration's API key is read from `<CONFIGURATION>_API_KEY` in
 * `backend/.env`; the local configuration needs none. The output cap is sent under the configuration's
 * `outputTokensParameter`, alongside its `requestOptions`.
 */
export const ModelLayer = Layer.unwrap(
  Effect.gen(function* () {
    const config = yield* AgentConfig
    const { key, endpoint } = yield* activeModel(config)
    const apiKey = key === "local" ? undefined : yield* Config.Redacted(`${key.toUpperCase()}_API_KEY`)
    return OpenAiLanguageModel.layer({
      model: endpoint.modelId,
      config: {
        ...endpoint.requestOptions,
        [endpoint.outputTokensParameter ?? "max_tokens"]: endpoint.answerTokens
      }
    }).pipe(Layer.provide(OpenAiClient.layer({ apiUrl: endpoint.baseUrl, apiKey })))
  })
)
