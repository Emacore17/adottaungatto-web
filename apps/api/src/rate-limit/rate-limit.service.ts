import { createHash } from "node:crypto"

import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  ServiceUnavailableException,
} from "@nestjs/common"

import { RedisService } from "../redis/redis.service.js"

export type RateLimitRule = {
  identifier: string
  limit: number
  namespace: string
  reason: string
  windowSeconds: number
}

@Injectable()
export class RateLimitService {
  constructor(
    @Inject(RedisService)
    private readonly redisService: RedisService
  ) {}

  async enforce(rules: readonly RateLimitRule[]) {
    for (const rule of rules) {
      const key = buildRateLimitKey(rule.namespace, rule.identifier)
      const result = await this.incrementRule(key, rule.windowSeconds)

      if (result.count > rule.limit) {
        throwRateLimitExceeded(rule.reason, result.ttlSeconds)
      }
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
