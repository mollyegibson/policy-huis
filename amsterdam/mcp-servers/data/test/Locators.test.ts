import { describe, expect, it } from "@effect/vitest"

import * as Locators from "../src/Locators.ts"

describe("locators", () => {
  it("name the subject alone when no filter is given", () => {
    expect(Locators.plannedProjects({})).toBe("Amsterdam planned housing projects")
  })

  it("list the given filters in order", () => {
    expect(
      Locators.plannedProjects({ district: "Zuid", neighborhood: "Zuidas", minUnits: 50, buildingFrom: "2027" })
    ).toBe(
      "Amsterdam planned housing projects, in the district of Zuid, in the neighborhood of Zuidas, planning at least 50 units, planning to start building in 2027 or later"
    )
  })

  it("name a grouping in words", () => {
    expect(Locators.plannedSummary({ groupBy: "planned_start_year", district: "Centrum" })).toBe(
      "Amsterdam planned housing projects and units by year of planned construction start, in the district of Centrum"
    )
    expect(Locators.rentalSummary({ groupBy: "room_type" })).toBe(
      "Short-term rental listings on Inside Airbnb by room type"
    )
  })

  it("name the filters an energy label query gave", () => {
    expect(Locators.energyLabelsSummary({ groupBy: "build_year_band", labelClass: "A" })).toBe(
      "Amsterdam's registered energy labels by the building's construction period, of label class A"
    )
    expect(Locators.energyLabelAtAddress({ postcode: "1011js", houseNumber: 1 })).toBe(
      "The energy label registered at 1011JS 1"
    )
  })

  it("name a listing query's registration filter", () => {
    expect(Locators.rentalListings({ neighbourhood: "Centrum-West", registeredOnly: true, minNightlyPrice: 100 })).toBe(
      "Short-term rental listings on Inside Airbnb, in Centrum-West, at 100 a night or more, whose host gives a registration"
    )
  })

  it("name a housing stock query's area and ranking", () => {
    expect(Locators.housingStock({ areaLevel: "buurt", area: "Vivaldi" })).toBe(
      "Amsterdam's housing stock from CBS key figures for its buurten, in Vivaldi"
    )
    expect(Locators.housingStock({ areaLevel: "wijk", sortBy: "pct_corporation_owned" })).toBe(
      "Amsterdam's housing stock from CBS key figures for its wijken, ranked by the share owned by housing corporations"
    )
  })
})
