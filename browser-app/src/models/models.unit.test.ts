import { describe, expect, it } from "@effect/vitest"

import type { OfferedModels } from "@policyhuis/protocol/QuestionsApi"

import { answeredBy, chosenModel } from "./models.ts"

const offered: OfferedModels = {
  default: "local",
  models: [
    { configuration: "local", label: "Open model on this computer", modelId: "gpt-oss:20b" },
    { configuration: "frontier", label: "Frontier model in the cloud", modelId: "claude-opus-5-5" }
  ]
}

describe("chosenModel", () => {
  it("keeps a stored choice the backend offers", () => {
    expect(chosenModel(offered, "frontier")).toBe("frontier")
  })

  it("falls back to the default with no stored choice, or one no longer offered", () => {
    expect(chosenModel(offered, null)).toBe("local")
    expect(chosenModel(offered, "retired")).toBe("local")
  })
})

describe("answeredBy", () => {
  it("names the configuration's label and the model ID", () => {
    expect(answeredBy(offered, { configuration: "frontier", modelId: "claude-opus-5-5" })).toBe(
      "Answered by Frontier model in the cloud (claude-opus-5-5)"
    )
  })

  it("names the configuration's key when the list is not loaded or does not offer it", () => {
    expect(answeredBy(null, { configuration: "local", modelId: "gpt-oss:20b" })).toBe("Answered by local (gpt-oss:20b)")
  })
})
