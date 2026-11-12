import type { OfferedModels } from "@policyhuis/protocol/QuestionsApi"

/** The configuration to ask with: the viewer's stored choice while the backend still offers it, else the default. */
export const chosenModel = (offered: OfferedModels, stored: string | null): string =>
  offered.models.some((model) => model.configuration === stored) && stored !== null ? stored : offered.default

/** How an answer names the model that wrote it: the configuration's label when it is offered, and its model ID. */
export const answeredBy = (
  offered: OfferedModels | null,
  model: { readonly configuration: string; readonly modelId: string }
): string => {
  const label = offered?.models.find((m) => m.configuration === model.configuration)?.label ?? model.configuration
  return `Answered by ${label} (${model.modelId})`
}
