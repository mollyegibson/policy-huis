import type { OfferedModels } from "@policyhuis/protocol/QuestionsApi"

/**
 * How many questions a run asks at once: the smallest `maxConcurrentQuestions` among the chosen configurations, so no
 * configuration is asked more than it admits, since promptfoo's limit covers every configuration in the run together.
 */
export const concurrencyFor = (offered: OfferedModels, chosen: ReadonlyArray<string>): number =>
  Math.max(
    1,
    Math.min(
      ...offered.models
        .filter((model) => chosen.includes(model.configuration))
        .map((model) => model.maxConcurrentQuestions)
    )
  )
