import { fileURLToPath } from "node:url"

import { Context, Effect, Layer } from "effect"

import { readConfigText } from "@policyhuis/node-config"

import { AgentConfig } from "../config/AgentConfig.ts"

const BACKEND_DIR = fileURLToPath(new URL("../../", import.meta.url))

/** The system prompt's text and version, read once at startup from `prompt.file`, relative to `backend/`. */
export class SystemPrompt extends Context.Service<SystemPrompt, { readonly text: string; readonly version: string }>()(
  "backend/SystemPrompt"
) {
  static readonly layer = Layer.effect(
    this,
    Effect.gen(function* () {
      const config = yield* AgentConfig
      const text = yield* readConfigText(fileURLToPath(new URL(config.prompt.file, `file://${BACKEND_DIR}`)))
      return { text, version: config.prompt.version }
    })
  )
}
