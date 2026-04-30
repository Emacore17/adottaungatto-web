import {
  Controller,
  Get,
  Inject,
  ServiceUnavailableException,
} from "@nestjs/common"
import { performance } from "node:perf_hooks"

import { DatabaseService } from "../database/database.service.js"
import { RedisService } from "../redis/redis.service.js"

@Controller("health")
export class HealthController {
  constructor(
    @Inject(DatabaseService)
    private readonly databaseService: DatabaseService,
    @Inject(RedisService)
    private readonly redisService: RedisService
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

  private async getDependencyHealth(
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

      throw new ServiceUnavailableException({
        service,
        status: "error",
        latencyMs,
        message,
      })
    }
  }
}
