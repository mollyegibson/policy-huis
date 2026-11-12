import { fileURLToPath } from "node:url"

import { Config, Context, Layer } from "effect"

import { dotEnv } from "@policyhuis/node-config"

/**
 * `evaluation/.env`, whose values take priority over the shell's. Every environment variable the evaluation reads is
 * declared in this module, each group read once at startup into its service below.
 */
export const EvaluationEnv = dotEnv(fileURLToPath(new URL("../.env", import.meta.url)))

/** The backend the evaluation asks. Environment: `EVALUATION_BACKEND_URL`. */
export class BackendConfig extends Context.Service<
  BackendConfig,
  {
    /** The backend's origin, under which it serves `/api/v1`. Default `http://localhost:3000`. */
    readonly url: string
  }
>()("evaluation/BackendConfig") {
  static readonly layer = Layer.effect(
    this,
    EvaluationEnv.load(
      Config.all({ url: Config.String("BACKEND_URL").pipe(Config.withDefault("http://localhost:3000")) }).pipe(
        Config.nested("EVALUATION")
      )
    )
  )
}
