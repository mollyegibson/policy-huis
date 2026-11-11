import { Config, Context, Effect, Layer, Schema } from "effect"
import { HttpClient, HttpClientRequest, HttpClientResponse } from "effect/http"

import { SearchConfig } from "./SearchConfig.ts"
import { EmbeddingModelUnavailable } from "./Tools.ts"

const Tags = Schema.Struct({ models: Schema.Array(Schema.Struct({ name: Schema.String, digest: Schema.String })) })
const Embeddings = Schema.Struct({ embeddings: Schema.Array(Schema.Array(Schema.Number)) })

/** Turns a search query into a vector with the model the stored search entries were embedded with. */
export class QueryEmbedder extends Context.Service<
  QueryEmbedder,
  { readonly embed: (query: string) => Effect.Effect<ReadonlyArray<number>, EmbeddingModelUnavailable> }
>()("QueryEmbedder") {
  /**
   * Ollama at `OLLAMA_URL` (default `http://localhost:11434`), the one embedding path the passage pipeline also
   * uses. Each query checks that Ollama still serves the configured build, prepends the configured instruction, and
   * is sent with `truncate: false`; a vector that is empty, all zeros or holds NaN is refused. Every failure is
   * logged and returned as `EmbeddingModelUnavailable`.
   */
  static readonly ollama = Layer.effect(
    this,
    Effect.gen(function* () {
      const search = yield* SearchConfig
      const url = yield* Config.String("OLLAMA_URL").pipe(Config.withDefault("http://localhost:11434"))
      const client = (yield* HttpClient.HttpClient).pipe(HttpClient.filterStatusOk)
      const unavailable = new EmbeddingModelUnavailable({ model: search.embeddingModelId })

      const embed = Effect.fn("QueryEmbedder.embed")(
        function* (query: string) {
          const tags = yield* client
            .get(`${url}/api/tags`)
            .pipe(Effect.flatMap(HttpClientResponse.schemaBodyJson(Tags)))
          const digest = tags.models.find((m) => m.name === search.embeddingModel)?.digest
          if (digest === undefined || !digest.startsWith(search.embeddingBuild)) {
            yield* Effect.logError(
              `Ollama serves ${search.embeddingModel} build ${digest?.slice(0, 12) ?? "none"}, ` +
                `not the configured ${search.embeddingBuild}`
            )
            return yield* unavailable
          }
          const response = yield* client.execute(
            HttpClientRequest.post(`${url}/api/embed`).pipe(
              HttpClientRequest.bodyJsonUnsafe({
                model: search.embeddingModel,
                input: [`${search.queryInstruction}${query}`],
                truncate: false,
                options: { num_ctx: search.numCtx }
              })
            )
          )
          const { embeddings } = yield* HttpClientResponse.schemaBodyJson(Embeddings)(response)
          const vector = embeddings[0]
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
