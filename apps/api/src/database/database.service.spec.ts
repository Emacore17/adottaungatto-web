import { describe, expect, it } from "vitest"

import type { ApiEnv } from "../config/env.js"
import { DatabaseService } from "./database.service.js"

const testEnv: ApiEnv = {
  API_GLOBAL_RATE_LIMIT_PER_MINUTE: 1200,
  API_PORT: 4000,
  API_TRUST_PROXY: false,
  APP_ENV: "test",
  APP_URL: "http://localhost:3000",
  DATABASE_URL:
    "postgresql://adottaungatto:adottaungatto@localhost:5432/adottaungatto",
  EMAIL_VERIFICATION_TTL_MINUTES: 60,
  MAIL_FROM: "no-reply@adottaungatto.local",
  MAIL_HOST: "localhost",
  MAIL_PORT: 1025,
  OBSERVABILITY_ALERT_ERROR_RATE_THRESHOLD: 0.05,
  OBSERVABILITY_ALERT_IN_FLIGHT_THRESHOLD: 50,
  OBSERVABILITY_ALERT_MIN_REQUESTS: 20,
  OBSERVABILITY_ALERT_P95_MS_THRESHOLD: 1000,
  PASSWORD_RESET_TTL_MINUTES: 30,
  PHONE_VERIFICATION_TTL_MINUTES: 10,
  RATE_LIMIT_ENABLED: true,
  RATE_LIMIT_LIMIT_MULTIPLIER: 1,
  RATE_LIMIT_WINDOW_MULTIPLIER: 1,
  REDIS_URL: "redis://localhost:6379",
  S3_ACCESS_KEY_ID: "minioadmin",
  S3_BUCKET: "adottaungatto-local",
  S3_ENDPOINT: "http://localhost:9000",
  S3_PUBLIC_ENDPOINT: "http://localhost:9000",
  S3_REGION: "local",
  S3_SECRET_ACCESS_KEY: "minioadmin",
}

describe("DatabaseService", () => {
  it("creates a database handle from the configured url", async () => {
    const service = new DatabaseService(testEnv)

    expect(service.db).toBeDefined()

    await service.onApplicationShutdown()
  })
})
