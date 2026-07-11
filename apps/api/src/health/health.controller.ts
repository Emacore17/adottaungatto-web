import {
  Controller,
  Get,
  Inject,
  Logger,
  ServiceUnavailableException,
  UseGuards,
} from "@nestjs/common"
import { performance } from "node:perf_hooks"

import { BearerAuthGuard } from "../auth/auth.guard.js"
import { RequireRoles } from "../auth/roles.decorator.js"
import { RolesGuard } from "../auth/roles.guard.js"
import { DatabaseService } from "../database/database.service.js"
import { ObservabilityService } from "../observability/observability.service.js"
import { RedisService } from "../redis/redis.service.js"

@Controller("health")
export class HealthController {
  private readonly logger = new Logger(HealthController.name)

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

  // Metriche e alert espongono contatori interni (route, latenze, in-flight):
  // riservati agli amministratori. La liveness/readiness restano pubbliche per
  // load balancer e orchestratori.
  @UseGuards(BearerAuthGuard, RolesGuard)
  @RequireRoles("admin")
  @Get("metrics")
  getMetrics() {
    return this.observabilityService.snapshot()
  }

  @UseGuards(BearerAuthGuard, RolesGuard)
  @RequireRoles("admin")
  @Get("alerts")
  getAlerts() {
    return this.observabilityService.alerts()
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

      // Il dettaglio dell'errore (host, DSN, stack) resta nei log server-side e
      // non viene mai restituito nella risposta HTTP.
      this.logger.error(
        `Health check failed for ${service}`,
        error instanceof Error ? error.stack : String(error)
      )

      return {
        service,
        status: "error",
        latencyMs,
      }
    }
  }
}
