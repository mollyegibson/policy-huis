import { describe, expect, it } from "@effect/vitest"

import type { OfferedModels } from "@policyhuis/protocol/QuestionsApi"

import { concurrencyFor } from "../src/Concurrency.ts"

const offered: OfferedModels = {
  default: "open_cloud",
  models: [
    { configuration: "local", label: "Local", modelId: "local-model", maxConcurrentQuestions: 1 },
    { configuration: "open_cloud", label: "Open", modelId: "open-model", maxConcurrentQuestions: 4 },
    { configuration: "frontier", label: "Frontier", modelId: "frontier-model", maxConcurrentQuestions: 3 }
  ]
}

describe("concurrencyFor", () => {
  it("asks as many questions at once as the most limited chosen configuration admits", () => {
    expect(concurrencyFor(offered, ["open_cloud"])).toBe(4)
    expect(concurrencyFor(offered, ["open_cloud", "frontier"])).toBe(3)
    expect(concurrencyFor(offered, ["open_cloud", "local"])).toBe(1)
  })
})
