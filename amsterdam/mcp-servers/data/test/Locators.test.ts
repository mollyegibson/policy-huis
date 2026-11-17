import { describe, expect, it } from "@effect/vitest"

import { phrase } from "../src/Locators.ts"

describe("locators", () => {
  it("name the subject alone when no filter is given", () => {
    expect(phrase("Housing stock", [])).toBe("Housing stock")
  })

  it("list the given filters in order", () => {
    expect(phrase("Housing stock", ["in Amsterdam", null, "by district"])).toBe(
      "Housing stock, in Amsterdam, by district"
    )
  })
})
