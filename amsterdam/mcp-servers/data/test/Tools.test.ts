import { describe, expect, it } from "@effect/vitest"

import { makeAmsDataToolkit } from "../src/Tools.ts"

describe("the tools the model reads", () => {
  it("are added as the data they read is modelled", () => {
    expect(Object.keys(makeAmsDataToolkit().tools)).toEqual([])
  })
})
