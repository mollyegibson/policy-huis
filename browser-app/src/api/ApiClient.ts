import { Context, Effect, Layer } from "effect"
import { FetchHttpClient } from "effect/http"
import { HttpApiClient } from "effect/http-api"

import { PolicyHuisApi } from "@policyhuis/protocol/QuestionsApi"

/** The typed client for the backend's API, on the app's own origin, where the dev server proxies `/api`. */
const makeClient = HttpApiClient.make(PolicyHuisApi, { baseUrl: window.location.origin })

export class ApiClient extends Context.Service<ApiClient, Effect.Success<typeof makeClient>>()(
  "browser-app/ApiClient"
) {
  static readonly layer = Layer.effect(this, makeClient).pipe(Layer.provide(FetchHttpClient.layer))
}
