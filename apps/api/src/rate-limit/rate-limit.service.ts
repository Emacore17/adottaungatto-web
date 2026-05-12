import { createHash } from "node:crypto"

import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Optional,
  ServiceUnavailableException,
} from "@nestjs/common"

import { API_ENV } from "../config/config.module.js"
import type { ApiEnv } from "../config/env.js"
import { RedisService } from "../redis/redis.service.js"

export type RateLimitRule = {
  identifier: string
  limit: number
  namespace: string
  reason: string
  windowSeconds: number
}

type RateLimitEnv = Pick<
  ApiEnv,
  | "RATE_LIMIT_ENABLED"
  | "RATE_LIMIT_LIMIT_MULTIPLIER"
  | "RATE_LIMIT_WINDOW_MULTIPLIER"
>

type RateLimitConfig = {
  enabled: boolean
  limitMultiplier: number
  windowMultiplier: number
}

@Injectable()
export class RateLimitService {
  private readonly config: RateLimitConfig

  constructor(
    @Inject(RedisService)
    private readonly redisService: RedisService,
    @Optional()
    @Inject(API_ENV)
    env?: RateLimitEnv
  ) {
    this.config = resolveRateLimitConfig(env)
  }

  async enforce(rules: readonly RateLimitRule[]) {
    if (!this.config.enabled) {
      return
    }

    for (const rule of rules) {
      const resolvedRule = this.resolveRule(rule)
      const key = buildRateLimitKey(rule.namespace, rule.identifier)
      const result = await this.incrementRule(key, resolvedRule.windowSeconds)

      if (result.count > resolvedRule.limit) {
        throwRateLimitExceeded(rule.reason, result.ttlSeconds)
      }
    }
  }

  private resolveRule(rule: RateLimitRule) {
    return {
      limit: Math.max(1, Math.ceil(rule.limit * this.config.limitMultiplier)),
      windowSeconds: Math.max(
        1,
        Math.ceil(rule.windowSeconds * this.config.windowMultiplier)
      ),
    }
  }

  private async incrementRule(key: string, windowSeconds: number) {
    try {
      return await this.redisService.incrementFixedWindow(key, windowSeconds)
    } catch {
      throw new ServiceUnavailableException({
        message: "Rate limit service unavailable.",
      })
    }
  }
}

function resolveRateLimitConfig(
  env: RateLimitEnv | undefined
): RateLimitConfig {
  return {
    enabled: env?.RATE_LIMIT_ENABLED ?? true,
    limitMultiplier: env?.RATE_LIMIT_LIMIT_MULTIPLIER ?? 1,
    windowMultiplier: env?.RATE_LIMIT_WINDOW_MULTIPLIER ?? 1,
  }
}

function buildRateLimitKey(namespace: string, identifier: string) {
  const safeNamespace = namespace.toLowerCase().replaceAll(/[^a-z0-9:_-]/g, "_")
  const identifierHash = createHash("sha256")
    .update(identifier)
    .digest("hex")
    .slice(0, 32)

  return `adottaungatto:rate-limit:${safeNamespace}:${identifierHash}`
}

function throwRateLimitExceeded(reason: string, ttlSeconds: number): never {
  throw new HttpException(
    {
      message: "Rate limit exceeded.",
      reason,
      retryAfterSeconds: Math.max(1, ttlSeconds),
    },
    HttpStatus.TOO_MANY_REQUESTS
  )
}
