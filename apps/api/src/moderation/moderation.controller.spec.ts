import { BadRequestException } from "@nestjs/common"
import { describe, expect, it, vi } from "vitest"

import { ModerationController } from "./moderation.controller.js"
import type { ModerationService } from "./moderation.service.js"

describe("ModerationController", () => {
  it("validates pending-review queue queries and delegates", async () => {
    const moderationService = {
      pendingReviewQueue: vi.fn().mockResolvedValue({ items: [], meta: {} }),
    } as unknown as ModerationService
    const controller = new ModerationController(moderationService)

    await controller.pendingReviewQueue(createAuth(), {
      page: "2",
      pageSize: "10",
    })

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
    const controller = new ModerationController(moderationService)

    await expect(
      controller.pendingReviewQueue(createAuth(), {
        page: "0",
      })
    ).rejects.toBeInstanceOf(BadRequestException)
    expect(moderationService.pendingReviewQueue).not.toHaveBeenCalled()
  })

  it("validates reported listings queue queries and delegates", async () => {
    const moderationService = {
      reportedListingsQueue: vi.fn().mockResolvedValue({ items: [], meta: {} }),
    } as unknown as ModerationService
    const controller = new ModerationController(moderationService)

    await controller.reportedListingsQueue(createAuth(), {
      page: "3",
      pageSize: "5",
    })

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
    const controller = new ModerationController(moderationService)

    await expect(
      controller.reportedListingsQueue(createAuth(), {
        pageSize: "101",
      })
    ).rejects.toBeInstanceOf(BadRequestException)
    expect(moderationService.reportedListingsQueue).not.toHaveBeenCalled()
  })

  it("validates and delegates approve decisions", async () => {
    const moderationService = {
      decideListingCase: vi.fn().mockResolvedValue({ decided: true }),
    } as unknown as ModerationService
    const controller = new ModerationController(moderationService)

    await controller.approveListingCase(
      createAuth(),
      {
        caseId: "11111111-1111-4111-8111-111111111111",
      },
      {
        reasonCode: "policy_ok",
      }
    )

    expect(moderationService.decideListingCase).toHaveBeenCalledWith(
      "moderator-id",
      "11111111-1111-4111-8111-111111111111",
      "approve",
      {
        reasonCode: "policy_ok",
      }
    )
  })

  it("validates and delegates reject decisions", async () => {
    const moderationService = {
      decideListingCase: vi.fn().mockResolvedValue({ decided: true }),
    } as unknown as ModerationService
    const controller = new ModerationController(moderationService)

    await controller.rejectListingCase(
      createAuth(),
      {
        caseId: "11111111-1111-4111-8111-111111111111",
      },
      {
        reasonText: "Descrizione non conforme.",
      }
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
    const controller = new ModerationController(moderationService)

    await controller.suspendListingCase(
      createAuth(),
      {
        caseId: "11111111-1111-4111-8111-111111111111",
      },
      {
        reasonCode: "risk_review",
      }
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
    const controller = new ModerationController(moderationService)

    await expect(
      controller.rejectListingCase(
        createAuth(),
        {
          caseId: "11111111-1111-4111-8111-111111111111",
        },
        {}
      )
    ).rejects.toBeInstanceOf(BadRequestException)
    expect(moderationService.decideListingCase).not.toHaveBeenCalled()
  })

  it("rejects invalid moderation case ids", async () => {
    const moderationService = {
      decideListingCase: vi.fn(),
    } as unknown as ModerationService
    const controller = new ModerationController(moderationService)

    await expect(
      controller.approveListingCase(
        createAuth(),
        {
          caseId: "not-a-uuid",
        },
        {
          reasonCode: "policy_ok",
        }
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
