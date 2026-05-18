import { BadRequestException } from "@nestjs/common"
import { describe, expect, it, vi } from "vitest"

import { ReportsController } from "./reports.controller.js"
import type { ReportsRateLimitRequest } from "./reports-rate-limit.js"
import type { ReportsService } from "./reports.service.js"
import type { RateLimitService } from "../rate-limit/rate-limit.service.js"

describe("ReportsController", () => {
  it("validates listing report payloads and delegates", async () => {
    const reportsService = {
      reportListing: vi.fn().mockResolvedValue({ created: true }),
    } as unknown as ReportsService
    const rateLimitService = createRateLimitService()
    const controller = new ReportsController(reportsService, rateLimitService)

    await controller.reportListing(
      createAuth(),
      {
        listingId: "11111111-1111-4111-8111-111111111111",
      },
      {
        reasonCode: "other",
        description: "  Serve una verifica manuale.  ",
      },
      createRequest()
    )

    expect(rateLimitService.enforce).toHaveBeenCalledWith([
      expect.objectContaining({
        identifier: "ip:203.0.113.20",
        namespace: "reports:listing:ip",
      }),
      expect.objectContaining({
        identifier: "user:reporter-id",
        namespace: "reports:listing:user",
      }),
      expect.objectContaining({
        identifier: "listing:11111111-1111-4111-8111-111111111111",
        namespace: "reports:listing:target",
      }),
    ])
    expect(reportsService.reportListing).toHaveBeenCalledWith(
      "reporter-id",
      "11111111-1111-4111-8111-111111111111",
      {
        reasonCode: "other",
        description: "Serve una verifica manuale.",
      }
    )
  })

  it("rejects listing report payloads without a required description", async () => {
    const reportsService = {
      reportListing: vi.fn(),
    } as unknown as ReportsService
    const controller = new ReportsController(
      reportsService,
      createRateLimitService()
    )

    await expect(
      controller.reportListing(
        createAuth(),
        {
          listingId: "11111111-1111-4111-8111-111111111111",
        },
        {
          reasonCode: "other",
        },
        createRequest()
      )
    ).rejects.toBeInstanceOf(BadRequestException)
    expect(reportsService.reportListing).not.toHaveBeenCalled()
  })

  it("rejects invalid listing ids", async () => {
    const reportsService = {
      reportListing: vi.fn(),
    } as unknown as ReportsService
    const controller = new ReportsController(
      reportsService,
      createRateLimitService()
    )

    await expect(
      controller.reportListing(
        createAuth(),
        {
          listingId: "not-a-uuid",
        },
        {
          reasonCode: "abuse",
        },
        createRequest()
      )
    ).rejects.toBeInstanceOf(BadRequestException)
    expect(reportsService.reportListing).not.toHaveBeenCalled()
  })
})

function createAuth() {
  return {
    user: {
      id: "reporter-id",
      email: "reporter@example.com",
      displayName: "Reporter",
      profileType: "private",
      status: "active",
    },
    session: {
      id: "session-id",
      expiresAt: "2026-05-30T10:00:00.000Z",
    },
  } as const
}

function createRateLimitService() {
  return {
    enforce: vi.fn().mockResolvedValue(undefined),
  } as unknown as RateLimitService
}

function createRequest(): ReportsRateLimitRequest {
  return {
    ip: "203.0.113.20",
  }
}
