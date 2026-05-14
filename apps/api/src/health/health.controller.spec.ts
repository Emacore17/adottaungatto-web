import { ServiceUnavailableException } from "@nestjs/common"
import { describe, expect, it } from "vitest"
import { vi } from "vitest"

import type { DatabaseService } from "../database/database.service.js"
import { ObservabilityService } from "../observability/observability.service.js"
import type { RedisService } from "../redis/redis.service.js"

import { HealthController } from "./health.controller.js"

describe("HealthController", () => {
  const databaseService = {
    ping: vi.fn(),
  } as unknown as DatabaseService
  const redisService = {
    ping: vi.fn(),
  } as unknown as RedisService
  const observabilityService = new ObservabilityService()

  it("returns api health status", () => {
    const response = new HealthController(
      databaseService,
      redisService,
      observabilityService
    ).getHealth()

    expect(response.service).toBe("api")
    expect(response.status).toBe("ok")
    expect(response.uptimeSeconds).toBeGreaterThanOrEqual(0)
  })

  it("returns database health status", async () => {
    databaseService.ping = vi.fn().mockResolvedValue(undefined)
    const controller = new HealthController(
      databaseService,
      redisService,
      observabilityService
    )

    const response = await controller.getDatabaseHealth()

    expect(response.service).toBe("database")
    expect(response.status).toBe("ok")
    expect(response.latencyMs).toBeGreaterThanOrEqual(0)
  })

  it("returns redis health status", async () => {
    redisService.ping = vi.fn().mockResolvedValue(undefined)
    const controller = new HealthController(
      databaseService,
      redisService,
      observabilityService
    )

    const response = await controller.getRedisHealth()

    expect(response.service).toBe("redis")
    expect(response.status).toBe("ok")
    expect(response.latencyMs).toBeGreaterThanOrEqual(0)
  })

  it("throws service unavailable when a dependency check fails", async () => {
    databaseService.ping = vi.fn().mockRejectedValue(new Error("db down"))
    const controller = new HealthController(
      databaseService,
      redisService,
      observabilityService
    )

    await expect(controller.getDatabaseHealth()).rejects.toBeInstanceOf(
      ServiceUnavailableException
    )
  })

  it("returns readiness when dependencies are available", async () => {
    databaseService.ping = vi.fn().mockResolvedValue(undefined)
    redisService.ping = vi.fn().mockResolvedValue(undefined)
    const controller = new HealthController(
      databaseService,
      redisService,
      observabilityService
    )

    const response = await controller.getReadiness()

    expect(response.service).toBe("api")
    expect(response.status).toBe("ready")
    expect(response.checks).toHaveLength(2)
  })

  it("returns observability metrics", () => {
    const controller = new HealthController(
      databaseService,
      redisService,
      observabilityService
    )

    const response = controller.getMetrics()

    expect(response.service).toBe("api")
    expect(response.http.requestsTotal).toBeGreaterThanOrEqual(0)
    expect(response.search.publicListings.requestsTotal).toBeGreaterThanOrEqual(
      0
    )
  })

  it("returns observability alerts", () => {
    const controller = new HealthController(
      databaseService,
      redisService,
      observabilityService
    )

    const response = controller.getAlerts()

    expect(response.service).toBe("api")
    expect(response.status).toBe("ok")
    expect(response.alerts).toEqual([])
  })
})
