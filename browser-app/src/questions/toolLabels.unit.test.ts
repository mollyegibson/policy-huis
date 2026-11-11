import { describe, expect, it } from "@effect/vitest"

import { toolLabel } from "./toolLabels.ts"

describe("toolLabel", () => {
  it("tags a call with its server's label and turns the tool's own name into words", () => {
    const server = { name: "sf-legal-text", label: "SF Law", tool: "search_policy" }
    expect(toolLabel("sf_law_search_policy", server)).toEqual({ tag: "SF Law", name: "Search policy" })
  })

  it("has no tag, and uses the called name, for a tool no server offered", () => {
    expect(toolLabel("sf_made_up", null)).toEqual({ tag: null, name: "Sf made up" })
  })
})
