import { describe, expect, it } from "vitest"

import type { ApiEnv } from "../config/env.js"
import { DatabaseService } from "./database.service.js"

const testEnv: ApiEnv = {
  API_PORT: 4000,
  APP_ENV: "test",
  APP_URL: "http://localhost:3000",
  DATABASE_URL:
    "postgresql://adottaungatto:adottaungatto@localhost:5432/adottaungatto",
  EMAIL_VERIFICATION_TTL_MINUTES: 60,
  MAIL_FROM: "no-reply@adottaungatto.local",
  MAIL_HOST: "localhost",
  MAIL_PORT: 1025,
  PASSWORD_RESET_TTL_MINUTES: 30,
  REDIS_URL: "redis://localhost:6379",
}

describe("DatabaseService", () => {
  it("creates a database handle from the configured url", async () => {
    const service = new DatabaseService(testEnv)

    expect(service.db).toBeDefined()

    await service.onApplicationShutdown()
  })
})
