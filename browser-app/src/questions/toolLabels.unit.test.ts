import { describe, expect, it } from "@effect/vitest"

import { toolLabel } from "./toolLabels.ts"

describe("toolLabel", () => {
  it("keeps the server prefix as a tag and turns the rest into words", () => {
    expect(toolLabel("sf_development_pipeline_summary")).toEqual({ tag: "SF", name: "Development pipeline summary" })
    expect(toolLabel("ams2_social_rent")).toEqual({ tag: "AMS2", name: "Social rent" })
  })

  it("has no tag for a name without a prefix", () => {
    expect(toolLabel("lookup")).toEqual({ tag: null, name: "Lookup" })
  })
})
