import { BadRequestException } from "@nestjs/common"
import { describe, expect, it, vi } from "vitest"

import type { RateLimitService } from "../rate-limit/rate-limit.service.js"
import { ModerationController } from "./moderation.controller.js"
import type { ModerationService } from "./moderation.service.js"

describe("ModerationController", () => {
  it("validates pending-review queue queries and delegates", async () => {
    const moderationService = {
      pendingReviewQueue: vi.fn().mockResolvedValue({ items: [], meta: {} }),
    } as unknown as ModerationService
    const rateLimitService = createRateLimitService()
    const controller = new ModerationController(
      moderationService,
      rateLimitService
    )

    await controller.pendingReviewQueue(
      createAuth(),
      {
        page: "2",
        pageSize: "10",
      },
      createRequest()
    )

    expect(rateLimitService.enforce).toHaveBeenCalledWith([
      expect.objectContaining({
        identifier: "ip:203.0.113.20",
        namespace: "moderation:queue:ip",
      }),
      expect.objectContaining({
        identifier: "user:moderator-id",
        namespace: "moderation:queue:pending-review:user",
      }),
    ])
    expect(moderationService.pendingReviewQueue).toHaveBeenCalledWith(
      "moderator-id",
      {
        page: 2,
        pageSize: 10,
      }
    )
  })

  it("rejects invalid queue queries", async () => {
    const moderationService = {
      pendingReviewQueue: vi.fn(),
    } as unknown as ModerationService
    const controller = new ModerationController(
      moderationService,
      createRateLimitService()
    )

    await expect(
      controller.pendingReviewQueue(
        createAuth(),
        {
          page: "0",
        },
        createRequest()
      )
    ).rejects.toBeInstanceOf(BadRequestException)
    expect(moderationService.pendingReviewQueue).not.toHaveBeenCalled()
  })

  it("validates reported listings queue queries and delegates", async () => {
    const moderationService = {
      reportedListingsQueue: vi.fn().mockResolvedValue({ items: [], meta: {} }),
    } as unknown as ModerationService
    const controller = new ModerationController(
      moderationService,
      createRateLimitService()
    )

    await controller.reportedListingsQueue(
      createAuth(),
      {
        page: "3",
        pageSize: "5",
      },
      createRequest()
    )

    expect(moderationService.reportedListingsQueue).toHaveBeenCalledWith(
      "moderator-id",
      {
        page: 3,
        pageSize: 5,
      }
    )
  })

  it("rejects invalid reported listings queue queries", async () => {
    const moderationService = {
      reportedListingsQueue: vi.fn(),
    } as unknown as ModerationService
    const controller = new ModerationController(
      moderationService,
      createRateLimitService()
    )

    await expect(
      controller.reportedListingsQueue(
        createAuth(),
        {
          pageSize: "101",
        },
        createRequest()
      )
    ).rejects.toBeInstanceOf(BadRequestException)
    expect(moderationService.reportedListingsQueue).not.toHaveBeenCalled()
  })

  it("validates recent moderation action queries and delegates", async () => {
    const moderationService = {
      recentListingActions: vi.fn().mockResolvedValue({ items: [], meta: {} }),
    } as unknown as ModerationService
    const rateLimitService = createRateLimitService()
    const controller = new ModerationController(
      moderationService,
      rateLimitService
    )

    await controller.recentListingActions(
      createAuth(),
      {
        page: "1",
        pageSize: "8",
      },
      createRequest()
    )

    expect(rateLimitService.enforce).toHaveBeenCalledWith([
      expect.objectContaining({
        identifier: "ip:203.0.113.20",
        namespace: "moderation:queue:ip",
      }),
      expect.objectContaining({
        identifier: "user:moderator-id",
        namespace: "moderation:queue:recent-actions:user",
      }),
    ])
    expect(moderationService.recentListingActions).toHaveBeenCalledWith(
      "moderator-id",
      {
        page: 1,
        pageSize: 8,
      }
    )
  })

  it("validates and delegates approve decisions", async () => {
    const moderationService = {
      decideListingCase: vi.fn().mockResolvedValue({ decided: true }),
    } as unknown as ModerationService
    const rateLimitService = createRateLimitService()
    const controller = new ModerationController(
      moderationService,
      rateLimitService
    )

    await controller.approveListingCase(
      createAuth(),
      {
        caseId: "11111111-1111-4111-8111-111111111111",
      },
      {
        reasonCode: "policy_ok",
      },
      createRequest()
    )

    expect(rateLimitService.enforce).toHaveBeenCalledWith([
      expect.objectContaining({
        identifier: "ip:203.0.113.20",
        namespace: "moderation:decision:ip",
      }),
      expect.objectContaining({
        identifier: "user:moderator-id",
        namespace: "moderation:decision:approve:user",
      }),
      expect.objectContaining({
        identifier: "case:11111111-1111-4111-8111-111111111111",
        namespace: "moderation:decision:case",
      }),
    ])
    expect(moderationService.decideListingCase).toHaveBeenCalledWith(
      "moderator-id",
      "11111111-1111-4111-8111-111111111111",
      "approve",
      {
        reasonCode: "policy_ok",
      }
    )
  })

  it("validates and delegates claim requests", async () => {
    const moderationService = {
      claimListingCase: vi.fn().mockResolvedValue({ claimed: true }),
    } as unknown as ModerationService
    const rateLimitService = createRateLimitService()
    const controller = new ModerationController(
      moderationService,
      rateLimitService
    )

    await controller.claimListingCase(
      createAuth(),
      {
        caseId: "11111111-1111-4111-8111-111111111111",
      },
      createRequest()
    )

    expect(rateLimitService.enforce).toHaveBeenCalledWith([
      expect.objectContaining({
        identifier: "ip:203.0.113.20",
        namespace: "moderation:claim:ip",
      }),
      expect.objectContaining({
        identifier: "user:moderator-id",
        namespace: "moderation:claim:user",
      }),
      expect.objectContaining({
        identifier: "case:11111111-1111-4111-8111-111111111111",
        namespace: "moderation:claim:case",
      }),
    ])
    expect(moderationService.claimListingCase).toHaveBeenCalledWith(
      "moderator-id",
      "11111111-1111-4111-8111-111111111111"
    )
  })

  it("validates and delegates comment requests", async () => {
    const moderationService = {
      commentListingCase: vi.fn().mockResolvedValue({ commented: true }),
    } as unknown as ModerationService
    const rateLimitService = createRateLimitService()
    const controller = new ModerationController(
      moderationService,
      rateLimitService
    )

    await controller.commentListingCase(
      createAuth(),
      {
        caseId: "11111111-1111-4111-8111-111111111111",
      },
      {
        note: "Controllare le immagini prima della decisione.",
      },
      createRequest()
    )

    expect(rateLimitService.enforce).toHaveBeenCalledWith([
      expect.objectContaining({
        identifier: "ip:203.0.113.20",
        namespace: "moderation:comment:ip",
      }),
      expect.objectContaining({
        identifier: "user:moderator-id",
        namespace: "moderation:comment:user",
      }),
      expect.objectContaining({
        identifier: "case:11111111-1111-4111-8111-111111111111",
        namespace: "moderation:comment:case",
      }),
    ])
    expect(moderationService.commentListingCase).toHaveBeenCalledWith(
      "moderator-id",
      "11111111-1111-4111-8111-111111111111",
      {
        note: "Controllare le immagini prima della decisione.",
      }
    )
  })

  it("validates and delegates reject decisions", async () => {
    const moderationService = {
      decideListingCase: vi.fn().mockResolvedValue({ decided: true }),
    } as unknown as ModerationService
    const controller = new ModerationController(
      moderationService,
      createRateLimitService()
    )

    await controller.rejectListingCase(
      createAuth(),
      {
        caseId: "11111111-1111-4111-8111-111111111111",
      },
      {
        reasonText: "Descrizione non conforme.",
      },
      createRequest()
    )

    expect(moderationService.decideListingCase).toHaveBeenCalledWith(
      "moderator-id",
      "11111111-1111-4111-8111-111111111111",
      "reject",
      {
        reasonText: "Descrizione non conforme.",
      }
    )
  })

  it("validates and delegates suspend decisions", async () => {
    const moderationService = {
      decideListingCase: vi.fn().mockResolvedValue({ decided: true }),
    } as unknown as ModerationService
    const controller = new ModerationController(
      moderationService,
      createRateLimitService()
    )

    await controller.suspendListingCase(
      createAuth(),
      {
        caseId: "11111111-1111-4111-8111-111111111111",
      },
      {
        reasonCode: "risk_review",
      },
      createRequest()
    )

    expect(moderationService.decideListingCase).toHaveBeenCalledWith(
      "moderator-id",
      "11111111-1111-4111-8111-111111111111",
      "suspend",
      {
        reasonCode: "risk_review",
      }
    )
  })

  it("rejects invalid moderation decision payloads", async () => {
    const moderationService = {
      decideListingCase: vi.fn(),
    } as unknown as ModerationService
    const controller = new ModerationController(
      moderationService,
      createRateLimitService()
    )

    await expect(
      controller.rejectListingCase(
        createAuth(),
        {
          caseId: "11111111-1111-4111-8111-111111111111",
        },
        {},
        createRequest()
      )
    ).rejects.toBeInstanceOf(BadRequestException)
    expect(moderationService.decideListingCase).not.toHaveBeenCalled()
  })

  it("rejects invalid moderation case ids", async () => {
    const moderationService = {
      decideListingCase: vi.fn(),
    } as unknown as ModerationService
    const controller = new ModerationController(
      moderationService,
      createRateLimitService()
    )

    await expect(
      controller.approveListingCase(
        createAuth(),
        {
          caseId: "not-a-uuid",
        },
        {
          reasonCode: "policy_ok",
        },
        createRequest()
      )
    ).rejects.toBeInstanceOf(BadRequestException)
    expect(moderationService.decideListingCase).not.toHaveBeenCalled()
  })
})

function createAuth() {
  return {
    user: {
      id: "moderator-id",
      email: "moderator@example.com",
      displayName: "Moderator",
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

function createRequest() {
  return {
    ip: "203.0.113.20",
  } as const
}
