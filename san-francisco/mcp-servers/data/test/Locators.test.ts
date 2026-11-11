import { describe, expect, it } from "@effect/vitest"

import * as Locators from "../src/Locators.ts"

describe("locators", () => {
  it("name the subject alone when no filter is given", () => {
    expect(Locators.developmentProjects({})).toBe("Planning pipeline projects")
  })

  it("list the given filters in order", () => {
    expect(
      Locators.developmentProjects({ status: "BP Filed", neighborhood: "Mission", approvedBefore: "2020-01-01" })
    ).toBe("Planning pipeline projects, with status BP Filed, in Mission, approved by Planning before 2020-01-01")
  })

  it("name a grouping in words", () => {
    expect(Locators.developmentSummary({ groupBy: "approval_year", affordableOnly: true })).toBe(
      "Planning pipeline projects and units by year of Planning approval, projects with affordable units only"
    )
  })

  it("name the zone a hazard result checked", () => {
    expect(Locators.hazardExposure({ projects: "affordable_pipeline" }, "Air Pollutant Exposure Zone")).toBe(
      "MOHCD affordable pipeline projects inside the Air Pollutant Exposure Zone"
    )
  })

  it("leave out an empty grouping", () => {
    expect(Locators.evictionCounts({ from: "2024-01", to: "2024-12", groupBy: [] })).toBe(
      "Eviction notices filed from 2024-01 to 2024-12"
    )
    expect(Locators.evictionCounts({ from: "2024-01", to: "2024-12", groupBy: ["ground", "year"] })).toBe(
      "Eviction notices filed from 2024-01 to 2024-12, by ground and year"
    )
  })
})
