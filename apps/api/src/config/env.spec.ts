import { describe, expect, it } from "vitest"

import { loadApiEnv } from "./env.js"

describe("loadApiEnv", () => {
  it("loads rate limit defaults", () => {
    const env = loadApiEnv({})

    expect(env.API_GLOBAL_RATE_LIMIT_PER_MINUTE).toBe(1200)
    expect(env.RATE_LIMIT_ENABLED).toBe(true)
    expect(env.RATE_LIMIT_LIMIT_MULTIPLIER).toBe(1)
    expect(env.RATE_LIMIT_WINDOW_MULTIPLIER).toBe(1)
  })

  it("loads proxy defaults", () => {
    const env = loadApiEnv({})

    expect(env.API_TRUST_PROXY).toBe(false)
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
      API_GLOBAL_RATE_LIMIT_PER_MINUTE: "600",
    })

    expect(env.API_GLOBAL_RATE_LIMIT_PER_MINUTE).toBe(600)
    expect(env.RATE_LIMIT_ENABLED).toBe(false)
    expect(env.RATE_LIMIT_LIMIT_MULTIPLIER).toBe(2.5)
    expect(env.RATE_LIMIT_WINDOW_MULTIPLIER).toBe(0.5)
  })

  it("parses proxy configuration from environment strings", () => {
    const env = loadApiEnv({
      API_TRUST_PROXY: "true",
    })

    expect(env.API_TRUST_PROXY).toBe(true)
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

  it("rejects local infrastructure defaults in production", () => {
    expect(() =>
      loadApiEnv({
        APP_ENV: "production",
      })
    ).toThrow()
  })

  it("accepts explicit non-local production infrastructure", () => {
    const env = loadApiEnv({
      APP_ENV: "production",
      APP_URL: "https://adottaungatto.it",
      DATABASE_URL: "postgresql://user:pass@postgres.example.com:5432/app",
      MAIL_HOST: "smtp.example.com",
      REDIS_URL: "redis://redis.example.com:6379",
      S3_ACCESS_KEY_ID: "prod-access-key",
      S3_BUCKET: "adottaungatto-prod",
      S3_ENDPOINT: "https://s3.example.com",
      S3_PUBLIC_ENDPOINT: "https://cdn.example.com",
      S3_REGION: "eu-south-1",
      S3_SECRET_ACCESS_KEY: "prod-secret-key",
    })

    expect(env.APP_ENV).toBe("production")
    expect(env.APP_URL).toBe("https://adottaungatto.it")
  })
})
