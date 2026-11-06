import { Context, Effect, FileSystem, Layer, Path } from "effect"

import { AgentConfig } from "../config/AgentConfig.ts"

/** The system prompt's text and version, read once at startup from the file named in `agent.yaml`. */
export class SystemPrompt extends Context.Service<SystemPrompt, { readonly text: string; readonly version: string }>()(
  "backend/SystemPrompt"
) {
  /** Reads `prompt.file`, relative to `backend/`. */
  static readonly layer = (backendDir: string) =>
    Layer.effect(
      this,
      Effect.gen(function* () {
        const config = yield* AgentConfig
        const fs = yield* FileSystem.FileSystem
        const path = yield* Path.Path
        const text = yield* fs.readFileString(path.join(backendDir, config.prompt.file)).pipe(Effect.orDie)
        return { text, version: config.prompt.version }
      })
    )
}
