import {
  Controller,
  Get,
  Inject,
  ServiceUnavailableException,
} from "@nestjs/common"
import { performance } from "node:perf_hooks"

import { DatabaseService } from "../database/database.service.js"
import { ObservabilityService } from "../observability/observability.service.js"
import { RedisService } from "../redis/redis.service.js"

@Controller("health")
export class HealthController {
  constructor(
    @Inject(DatabaseService)
    private readonly databaseService: DatabaseService,
    @Inject(RedisService)
    private readonly redisService: RedisService,
    @Inject(ObservabilityService)
    private readonly observabilityService: ObservabilityService
  ) {}

  @Get()
  getHealth() {
    return {
      service: "api",
      status: "ok",
      uptimeSeconds: Math.round(process.uptime()),
    }
  }

  @Get("database")
  async getDatabaseHealth() {
    return this.getDependencyHealth("database", () =>
      this.databaseService.ping()
    )
  }

  @Get("redis")
  async getRedisHealth() {
    return this.getDependencyHealth("redis", () => this.redisService.ping())
  }

  @Get("ready")
  async getReadiness() {
    const checks = await Promise.allSettled([
      this.checkDependency("database", () => this.databaseService.ping()),
      this.checkDependency("redis", () => this.redisService.ping()),
    ])
    const results = checks.map((check) =>
      check.status === "fulfilled"
        ? check.value
        : {
            service: "unknown",
            status: "error",
            latencyMs: 0,
            message:
              check.reason instanceof Error
                ? check.reason.message
                : String(check.reason),
          }
    )
    const isReady = results.every((result) => result.status === "ok")

    if (!isReady) {
      throw new ServiceUnavailableException({
        service: "api",
        status: "not_ready",
        checks: results,
      })
    }

    return {
      service: "api",
      status: "ready",
      checks: results,
    }
  }

  @Get("metrics")
  getMetrics() {
    return this.observabilityService.snapshot()
  }

  private async getDependencyHealth(
    service: "database" | "redis",
    check: () => Promise<void>
  ) {
    const result = await this.checkDependency(service, check)

    if (result.status === "error") {
      throw new ServiceUnavailableException(result)
    }

    return result
  }

  private async checkDependency(
    service: "database" | "redis",
    check: () => Promise<void>
  ) {
    const startedAt = performance.now()

    try {
      await check()

      return {
        service,
        status: "ok",
        latencyMs: Math.round(performance.now() - startedAt),
      }
    } catch (error: unknown) {
      const latencyMs = Math.round(performance.now() - startedAt)
      const message = error instanceof Error ? error.message : String(error)

      return {
        service,
        status: "error",
        latencyMs,
        message,
      }
    }
  }
}
