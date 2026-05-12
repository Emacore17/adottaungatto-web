import { describe, expect, it, vi } from "vitest"

import type { RedisService } from "../redis/redis.service.js"
import { RateLimitService } from "./rate-limit.service.js"

describe("RateLimitService", () => {
  it("increments hashed fixed-window keys", async () => {
    const redisService = {
      incrementFixedWindow: vi.fn().mockResolvedValue({
        count: 1,
        ttlSeconds: 900,
      }),
    } as unknown as RedisService
    const service = new RateLimitService(redisService)

    await service.enforce([
      {
        identifier: "ip:127.0.0.1",
        limit: 2,
        namespace: "auth:login:ip",
        reason: "auth_login_ip_limit",
        windowSeconds: 900,
      },
    ])

    expect(redisService.incrementFixedWindow).toHaveBeenCalledWith(
      expect.stringMatching(
        /^adottaungatto:rate-limit:auth:login:ip:[a-f0-9]{32}$/
      ),
      900
    )
  })

  it("rejects requests over the configured limit", async () => {
    const redisService = {
      incrementFixedWindow: vi.fn().mockResolvedValue({
        count: 3,
        ttlSeconds: 120,
      }),
    } as unknown as RedisService
    const service = new RateLimitService(redisService)

    await expect(
      service.enforce([
        {
          identifier: "email:user@example.com",
          limit: 2,
          namespace: "auth:login:email",
          reason: "auth_login_email_limit",
          windowSeconds: 900,
        },
      ])
    ).rejects.toMatchObject({
      response: {
        reason: "auth_login_email_limit",
        retryAfterSeconds: 120,
      },
      status: 429,
    })
  })

  it("applies environment multipliers to limits and windows", async () => {
    const redisService = {
      incrementFixedWindow: vi.fn().mockResolvedValue({
        count: 5,
        ttlSeconds: 1800,
      }),
    } as unknown as RedisService
    const service = new RateLimitService(redisService, {
      RATE_LIMIT_ENABLED: true,
      RATE_LIMIT_LIMIT_MULTIPLIER: 2,
      RATE_LIMIT_WINDOW_MULTIPLIER: 2,
    })

    await expect(
      service.enforce([
        {
          identifier: "email:user@example.com",
          limit: 2,
          namespace: "auth:login:email",
          reason: "auth_login_email_limit",
          windowSeconds: 900,
        },
      ])
    ).rejects.toMatchObject({
      response: {
        reason: "auth_login_email_limit",
        retryAfterSeconds: 1800,
      },
      status: 429,
    })
    expect(redisService.incrementFixedWindow).toHaveBeenCalledWith(
      expect.stringMatching(
        /^adottaungatto:rate-limit:auth:login:email:[a-f0-9]{32}$/
      ),
      1800
    )
  })

  it("skips Redis when rate limits are disabled by environment", async () => {
    const redisService = {
      incrementFixedWindow: vi.fn(),
    } as unknown as RedisService
    const service = new RateLimitService(redisService, {
      RATE_LIMIT_ENABLED: false,
      RATE_LIMIT_LIMIT_MULTIPLIER: 1,
      RATE_LIMIT_WINDOW_MULTIPLIER: 1,
    })

    await service.enforce([
      {
        identifier: "ip:127.0.0.1",
        limit: 2,
        namespace: "auth:login:ip",
        reason: "auth_login_ip_limit",
        windowSeconds: 900,
      },
    ])

    expect(redisService.incrementFixedWindow).not.toHaveBeenCalled()
  })

  it("fails closed when Redis is unavailable", async () => {
    const redisService = {
      incrementFixedWindow: vi.fn().mockRejectedValue(new Error("redis down")),
    } as unknown as RedisService
    const service = new RateLimitService(redisService)

    await expect(
      service.enforce([
        {
          identifier: "ip:127.0.0.1",
          limit: 2,
          namespace: "auth:login:ip",
          reason: "auth_login_ip_limit",
          windowSeconds: 900,
        },
      ])
    ).rejects.toMatchObject({
      response: {
        message: "Rate limit service unavailable.",
      },
      status: 503,
    })
  })
})
