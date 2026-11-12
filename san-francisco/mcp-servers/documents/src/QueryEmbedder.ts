import { Context, Effect, Layer, Redacted, Schema } from "effect"
import { HttpClient, HttpClientRequest, HttpClientResponse } from "effect/http"

import { SearchConfig } from "./SearchConfig.ts"
import { OpenRouterConfig } from "./SfDocsServerConfig.ts"
import { EmbeddingModelUnavailable } from "./Tools.ts"

const Embeddings = Schema.Struct({
  provider: Schema.String,
  data: Schema.Array(Schema.Struct({ index: Schema.Number, embedding: Schema.Array(Schema.Number) }))
})

/** OpenRouter's name for the host that answered (`DeepInfra`), compared with a provider slug (`deepinfra`). */
const slugOf = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, "")

/** Turns a search query into a vector with the model and host the stored search entries were embedded with. */
export class QueryEmbedder extends Context.Service<
  QueryEmbedder,
  { readonly embed: (query: string) => Effect.Effect<ReadonlyArray<number>, EmbeddingModelUnavailable> }
>()("QueryEmbedder") {
  /**
   * OpenRouter's embeddings API, the one embedding path the passage pipeline also uses. Each query prepends the
   * configured instruction and pins the configured host with fallbacks off; a response from another host, or a vector
   * that is empty, all zeros or holds NaN, is refused. Every failure is logged and returned as
   * `EmbeddingModelUnavailable`.
   */
  static readonly openRouter = Layer.effect(
    this,
    Effect.gen(function* () {
      const search = yield* SearchConfig
      const { apiKey } = yield* OpenRouterConfig
      const client = (yield* HttpClient.HttpClient).pipe(HttpClient.filterStatusOk)
      const unavailable = new EmbeddingModelUnavailable({ model: search.embeddingModelId })

      const embed = Effect.fn("QueryEmbedder.embed")(
        function* (query: string) {
          const response = yield* client.execute(
            HttpClientRequest.post(`${search.embeddingApi}/embeddings`).pipe(
              HttpClientRequest.bearerToken(Redacted.value(apiKey)),
              HttpClientRequest.bodyJsonUnsafe({
                model: search.embeddingModel,
                input: [`${search.queryInstruction}${query}`],
                provider: { order: [search.embeddingHost], allow_fallbacks: false }
              })
            )
          )
          const { provider, data } = yield* HttpClientResponse.schemaBodyJson(Embeddings)(response)
          if (slugOf(provider) !== slugOf(search.embeddingHost)) {
            yield* Effect.logError(`${search.embeddingModel} was served by ${provider}, not ${search.embeddingHost}`)
            return yield* unavailable
          }
          const vector = data.find((d) => d.index === 0)?.embedding
          if (vector === undefined || !vector.some((x) => x !== 0) || vector.some((x) => Number.isNaN(x))) {
            yield* Effect.logError(`${search.embeddingModelId} returned an unusable vector`)
            return yield* unavailable
          }
          return vector
        },
        Effect.catchTags({
          HttpClientError: (error) =>
            Effect.logWarning("The embedding model could not be reached", error).pipe(
              Effect.andThen(Effect.fail(unavailable))
            ),
          SchemaError: (error) =>
            Effect.logError("The embedding model's response could not be read", error).pipe(
              Effect.andThen(Effect.fail(unavailable))
            )
        })
      )
      return { embed }
    })
  )
}
