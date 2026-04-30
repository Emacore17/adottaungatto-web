import { ServiceUnavailableException } from "@nestjs/common"
import { describe, expect, it } from "vitest"
import { vi } from "vitest"

import type { DatabaseService } from "../database/database.service.js"
import type { RedisService } from "../redis/redis.service.js"

import { HealthController } from "./health.controller.js"

describe("HealthController", () => {
  const databaseService = {
    ping: vi.fn(),
  } as unknown as DatabaseService
  const redisService = {
    ping: vi.fn(),
  } as unknown as RedisService

  it("returns api health status", () => {
    const response = new HealthController(
      databaseService,
      redisService
    ).getHealth()

    expect(response.service).toBe("api")
    expect(response.status).toBe("ok")
    expect(response.uptimeSeconds).toBeGreaterThanOrEqual(0)
  })

  it("returns database health status", async () => {
    databaseService.ping = vi.fn().mockResolvedValue(undefined)
    const controller = new HealthController(databaseService, redisService)

    const response = await controller.getDatabaseHealth()

    expect(response.service).toBe("database")
    expect(response.status).toBe("ok")
    expect(response.latencyMs).toBeGreaterThanOrEqual(0)
  })

  it("returns redis health status", async () => {
    redisService.ping = vi.fn().mockResolvedValue(undefined)
    const controller = new HealthController(databaseService, redisService)

    const response = await controller.getRedisHealth()

    expect(response.service).toBe("redis")
    expect(response.status).toBe("ok")
    expect(response.latencyMs).toBeGreaterThanOrEqual(0)
  })

  it("throws service unavailable when a dependency check fails", async () => {
    databaseService.ping = vi.fn().mockRejectedValue(new Error("db down"))
    const controller = new HealthController(databaseService, redisService)

    await expect(controller.getDatabaseHealth()).rejects.toBeInstanceOf(
      ServiceUnavailableException
    )
  })
})
