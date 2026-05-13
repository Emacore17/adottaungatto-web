import { describe, expect, it } from "vitest"

import { loadApiEnv } from "./env.js"

describe("loadApiEnv", () => {
  it("loads rate limit defaults", () => {
    const env = loadApiEnv({})

    expect(env.RATE_LIMIT_ENABLED).toBe(true)
    expect(env.RATE_LIMIT_LIMIT_MULTIPLIER).toBe(1)
    expect(env.RATE_LIMIT_WINDOW_MULTIPLIER).toBe(1)
  })

  it("loads observability alert defaults", () => {
    const env = loadApiEnv({})

    expect(env.OBSERVABILITY_ALERT_ERROR_RATE_THRESHOLD).toBe(0.05)
    expect(env.OBSERVABILITY_ALERT_IN_FLIGHT_THRESHOLD).toBe(50)
    expect(env.OBSERVABILITY_ALERT_MIN_REQUESTS).toBe(20)
    expect(env.OBSERVABILITY_ALERT_P95_MS_THRESHOLD).toBe(1000)
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

  it("parses observability alert tuning from environment strings", () => {
    const env = loadApiEnv({
      OBSERVABILITY_ALERT_ERROR_RATE_THRESHOLD: "0.1",
      OBSERVABILITY_ALERT_IN_FLIGHT_THRESHOLD: "75",
      OBSERVABILITY_ALERT_MIN_REQUESTS: "5",
      OBSERVABILITY_ALERT_P95_MS_THRESHOLD: "750",
    })

    expect(env.OBSERVABILITY_ALERT_ERROR_RATE_THRESHOLD).toBe(0.1)
    expect(env.OBSERVABILITY_ALERT_IN_FLIGHT_THRESHOLD).toBe(75)
    expect(env.OBSERVABILITY_ALERT_MIN_REQUESTS).toBe(5)
    expect(env.OBSERVABILITY_ALERT_P95_MS_THRESHOLD).toBe(750)
  })
})
