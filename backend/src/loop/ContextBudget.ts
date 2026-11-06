import type { Prompt, Response } from "effect/ai"

import type { StepEnded } from "./LoopEvent.ts"

export interface BudgetSettings {
  readonly contextTokens: number
  readonly answerTokens: number
  readonly bytesPerToken: number
}

const encoder = new TextEncoder()
const byteLength = (text: string) => encoder.encode(text).length

/** The bytes of a tool result as the model reads it: its model output when it has one, else its encoded result. */
const toolResultBytes = (part: Response.AnyPart): number => {
  if (part.type !== "tool-result") return 0
  if (part.modelOutput !== undefined) {
    return part.modelOutput.reduce((sum, output) => sum + (output.type === "text" ? byteLength(output.text) : 0), 0)
  }
  return byteLength(JSON.stringify(part.encodedResult))
}

/**
 * Estimated tokens of the next prompt: the step's reported input and output tokens plus its tool results' bytes
 * converted with `bytesPerToken`. When the provider reported no usage, the whole next prompt's bytes are converted.
 */
export const estimateNextPromptTokens = (
  ended: StepEnded,
  nextPrompt: Prompt.Prompt,
  settings: BudgetSettings
): number =>
  ended.inputTokens !== undefined && ended.outputTokens !== undefined
    ? ended.inputTokens +
      ended.outputTokens +
      ended.parts.reduce((sum, part) => sum + toolResultBytes(part), 0) / settings.bytesPerToken
    : byteLength(JSON.stringify(nextPrompt.content)) / settings.bytesPerToken

/** Whether a prompt of this many tokens leaves `answerTokens` free in the model's context. */
export const fits = (tokens: number, settings: BudgetSettings): boolean =>
  tokens <= settings.contextTokens - settings.answerTokens
