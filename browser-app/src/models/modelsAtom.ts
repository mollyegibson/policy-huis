import { Effect } from "effect"

import { ApiClient } from "../api/ApiClient.ts"
import { apiRuntime } from "../api/runtime.ts"

/** The model configurations the backend offers, from `GET /api/v1/models`, fetched once per page load. */
export const modelsAtom = apiRuntime.atom(
  Effect.gen(function* () {
    const client = yield* ApiClient
    return yield* client.models.list()
  })
)
