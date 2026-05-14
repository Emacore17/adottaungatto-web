import type { CallHandler, ExecutionContext } from "@nestjs/common"
import { describe, expect, it, vi } from "vitest"
import { lastValueFrom, of } from "rxjs"

import { GlobalRateLimitInterceptor } from "./global-rate-limit.interceptor.js"
import type { RateLimitService } from "./rate-limit.service.js"

describe("GlobalRateLimitInterceptor", () => {
  it("enforces a global IP rule for HTTP requests", async () => {
    const rateLimitService = createRateLimitService()
    const interceptor = new GlobalRateLimitInterceptor(rateLimitService, {
      API_GLOBAL_RATE_LIMIT_PER_MINUTE: 600,
    })
    const next = createNextHandler()

    await expect(
      lastValueFrom(
        interceptor.intercept(
          createHttpContext({ ip: "203.0.113.10" }),
          next
        )
      )
    ).resolves.toBe("ok")

    expect(rateLimitService.enforce).toHaveBeenCalledWith([
      expect.objectContaining({
        identifier: "ip:203.0.113.10",
        limit: 600,
        namespace: "api:global:ip",
        reason: "api_global_ip_limit",
        windowSeconds: 60,
      }),
    ])
    expect(next.handle).toHaveBeenCalledTimes(1)
  })

  it("skips non-HTTP contexts", async () => {
    const rateLimitService = createRateLimitService()
    const interceptor = new GlobalRateLimitInterceptor(rateLimitService, {
      API_GLOBAL_RATE_LIMIT_PER_MINUTE: 600,
    })
    const next = createNextHandler()

    await expect(
      lastValueFrom(interceptor.intercept(createRpcContext(), next))
    ).resolves.toBe("ok")

    expect(rateLimitService.enforce).not.toHaveBeenCalled()
  })
})

function createRateLimitService() {
  return {
    enforce: vi.fn().mockResolvedValue(undefined),
  } as unknown as RateLimitService
}

function createNextHandler(): CallHandler {
  return {
    handle: vi.fn(() => of("ok")),
  }
}

function createHttpContext(request: { ip?: string }): ExecutionContext {
  return {
    getType: () => "http",
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as unknown as ExecutionContext
}

function createRpcContext(): ExecutionContext {
  return {
    getType: () => "rpc",
  } as unknown as ExecutionContext
}
