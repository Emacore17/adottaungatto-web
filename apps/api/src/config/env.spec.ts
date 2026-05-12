import { describe, expect, it } from "vitest"

import { loadApiEnv } from "./env.js"

describe("loadApiEnv", () => {
  it("loads rate limit defaults", () => {
    const env = loadApiEnv({})

    expect(env.RATE_LIMIT_ENABLED).toBe(true)
    expect(env.RATE_LIMIT_LIMIT_MULTIPLIER).toBe(1)
    expect(env.RATE_LIMIT_WINDOW_MULTIPLIER).toBe(1)
  })

  it("parses rate limit tuning from environment strings", () => {
    const env = loadApiEnv({
      RATE_LIMIT_ENABLED: "false",
      RATE_LIMIT_LIMIT_MULTIPLIER: "2.5",
      RATE_LIMIT_WINDOW_MULTIPLIER: "0.5",
    })

    expect(env.RATE_LIMIT_ENABLED).toBe(false)
    expect(env.RATE_LIMIT_LIMIT_MULTIPLIER).toBe(2.5)
    expect(env.RATE_LIMIT_WINDOW_MULTIPLIER).toBe(0.5)
  })
})
