import { describe, expect, it } from "vitest"

import { evaluateItalianPlacesHealth } from "./verify-italian-places.js"

describe("evaluateItalianPlacesHealth", () => {
  it("accepts a complete active Italian places dataset without duplicates", () => {
    const result = evaluateItalianPlacesHealth({
      duplicateActivePlaceGroups: 0,
      municipalities: 7894,
      provinces: 110,
      regions: 20,
    })

    expect(result.ok).toBe(true)
    expect(result.errors).toEqual([])
  })

  it("rejects incomplete place counts", () => {
    const result = evaluateItalianPlacesHealth({
      duplicateActivePlaceGroups: 0,
      municipalities: 6,
      provinces: 6,
      regions: 5,
    })

    expect(result.ok).toBe(false)
    expect(result.errors).toEqual([
      "Expected at least 20 active regions, found 5.",
      "Expected at least 100 active provinces, found 6.",
      "Expected at least 7800 active municipalities, found 6.",
    ])
  })

  it("rejects duplicate active places", () => {
    const result = evaluateItalianPlacesHealth({
      duplicateActivePlaceGroups: 2,
      municipalities: 7894,
      provinces: 110,
      regions: 20,
    })

    expect(result.ok).toBe(false)
    expect(result.errors).toEqual(["Found 2 duplicate active place groups."])
  })
})
