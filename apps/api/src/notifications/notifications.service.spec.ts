import { NotFoundException } from "@nestjs/common"
import { describe, expect, it, vi } from "vitest"

import type { DatabaseService } from "../database/database.service.js"
import { NotificationsService } from "./notifications.service.js"

describe("NotificationsService", () => {
  it("lists user notifications with unread count", async () => {
    const databaseService = {
      queryRows: vi.fn().mockResolvedValue([
        {
          total_count: "1",
          unread_count: "3",
          id: "notification-id",
          type: "listing_moderation_decision",
          payload: JSON.stringify({
            listingId: "listing-id",
            decision: "approved",
          }),
          read_at: null,
          created_at: "2026-05-01T10:00:00.000Z",
        },
      ]),
    } as unknown as DatabaseService
    const service = new NotificationsService(databaseService)

    await expect(
      service.list("user-id", {
        page: 2,
        pageSize: 10,
        unreadOnly: true,
      })
    ).resolves.toEqual({
      items: [
        {
          id: "notification-id",
          type: "listing_moderation_decision",
          payload: {
            listingId: "listing-id",
            decision: "approved",
          },
          readAt: null,
          createdAt: "2026-05-01T10:00:00.000Z",
        },
      ],
      meta: {
        page: 2,
        pageSize: 10,
        total: 1,
        totalPages: 1,
        unreadCount: 3,
      },
    })
    expect(databaseService.queryRows).toHaveBeenCalledWith(expect.any(String), [
      "user-id",
      10,
      10,
      true,
    ])
  })

  it("returns the unread count", async () => {
    const databaseService = {
      queryRows: vi.fn().mockResolvedValue([{ unread_count: "4" }]),
    } as unknown as DatabaseService
    const service = new NotificationsService(databaseService)

    await expect(service.unreadCount("user-id")).resolves.toEqual({
      unreadCount: 4,
    })
  })

  it("streams an initial unread count snapshot", async () => {
    const databaseService = {
      queryRows: vi.fn().mockResolvedValue([{ unread_count: "2" }]),
    } as unknown as DatabaseService
    const service = new NotificationsService(databaseService)
    const events: unknown[] = []

    const subscription = service.stream("user-id").subscribe((event) => {
      events.push(event)
    })

    await nextTick()
    subscription.unsubscribe()

    expect(events).toContainEqual(
      expect.objectContaining({
        data: {
          unreadCount: 2,
        },
        type: "snapshot",
      })
    )
  })

  it("streams created notifications to the owner", async () => {
    const databaseService = {
      queryRows: vi.fn((sql: string) => {
        if (sql.includes("insert into notifications")) {
          return Promise.resolve([
            {
              id: "notification-id",
              type: "listing_moderation_decision",
              payload: {
                listingId: "listing-id",
              },
              read_at: null,
              created_at: "2026-05-01T10:00:00.000Z",
            },
          ])
        }

        return Promise.resolve([{ unread_count: "1" }])
      }),
    } as unknown as DatabaseService
    const service = new NotificationsService(databaseService)
    const events: unknown[] = []
    const subscription = service.stream("user-id").subscribe((event) => {
      events.push(event)
    })

    await nextTick()
    await service.createListingModerationDecisionNotification("user-id", {
      caseId: "case-id",
      decision: "approved",
      listingId: "listing-id",
      listingSlug: "gattino-a-roma",
      listingTitle: "Gattino a Roma",
      reasonCode: "policy_ok",
      reasonText: null,
    })
    await nextTick()
    subscription.unsubscribe()

    expect(events).toContainEqual(
      expect.objectContaining({
        data: expect.objectContaining({
          notification: expect.objectContaining({
            id: "notification-id",
            payload: {
              listingId: "listing-id",
            },
          }),
          unreadCount: 1,
        }),
        type: "created",
      })
    )
  })

  it("marks a notification as read", async () => {
    const databaseService = {
      queryRows: vi.fn().mockResolvedValue([
        {
          id: "notification-id",
          type: "listing_report_decision",
          payload: {
            reportId: "report-id",
          },
          read_at: "2026-05-01T11:00:00.000Z",
          created_at: "2026-05-01T10:00:00.000Z",
        },
      ]),
    } as unknown as DatabaseService
    const service = new NotificationsService(databaseService)

    await expect(
      service.markRead("user-id", "notification-id")
    ).resolves.toEqual({
      id: "notification-id",
      type: "listing_report_decision",
      payload: {
        reportId: "report-id",
      },
      readAt: "2026-05-01T11:00:00.000Z",
      createdAt: "2026-05-01T10:00:00.000Z",
    })
  })

  it("throws when marking a missing notification as read", async () => {
    const databaseService = {
      queryRows: vi.fn().mockResolvedValue([]),
    } as unknown as DatabaseService
    const service = new NotificationsService(databaseService)

    await expect(
      service.markRead("user-id", "missing-id")
    ).rejects.toBeInstanceOf(NotFoundException)
  })

  it("marks all unread notifications as read", async () => {
    const databaseService = {
      queryRows: vi.fn().mockResolvedValue([{ updated_count: "2" }]),
    } as unknown as DatabaseService
    const service = new NotificationsService(databaseService)

    await expect(service.markAllRead("user-id")).resolves.toEqual({
      updatedCount: 2,
    })
  })

  it("creates listing moderation decision notifications", async () => {
    const databaseService = {
      queryRows: vi.fn().mockResolvedValue([
        {
          id: "notification-id",
          type: "listing_moderation_decision",
          payload: {
            listingId: "listing-id",
          },
          read_at: null,
          created_at: "2026-05-01T10:00:00.000Z",
        },
      ]),
    } as unknown as DatabaseService
    const service = new NotificationsService(databaseService)

    await service.createListingModerationDecisionNotification("user-id", {
      caseId: "case-id",
      decision: "approved",
      listingId: "listing-id",
      listingSlug: "gattino-a-roma",
      listingTitle: "Gattino a Roma",
      reasonCode: "policy_ok",
      reasonText: null,
    })

    const [, type, payload] =
      vi.mocked(databaseService.queryRows).mock.calls[0]?.[1] ?? []

    expect(type).toBe("listing_moderation_decision")
    expect(JSON.parse(String(payload))).toEqual({
      caseId: "case-id",
      decision: "approved",
      listingId: "listing-id",
      listingSlug: "gattino-a-roma",
      listingTitle: "Gattino a Roma",
      reasonCode: "policy_ok",
      reasonText: null,
    })
  })

  it("creates listing review submission notifications", async () => {
    const databaseService = {
      queryRows: vi.fn().mockResolvedValue([
        {
          id: "notification-id",
          type: "listing_review_submission",
          payload: {
            listingId: "listing-id",
          },
          read_at: null,
          created_at: "2026-05-01T10:00:00.000Z",
        },
      ]),
    } as unknown as DatabaseService
    const service = new NotificationsService(databaseService)

    await service.createListingReviewSubmissionNotification("user-id", {
      listingId: "listing-id",
      listingSlug: "gattino-a-roma",
      listingTitle: "Gattino a Roma",
      moderationStatus: "pending_review",
    })

    const [, type, payload] =
      vi.mocked(databaseService.queryRows).mock.calls[0]?.[1] ?? []

    expect(type).toBe("listing_review_submission")
    expect(JSON.parse(String(payload))).toEqual({
      listingId: "listing-id",
      listingSlug: "gattino-a-roma",
      listingTitle: "Gattino a Roma",
      moderationStatus: "pending_review",
    })
  })

  it("creates listing contact request notifications", async () => {
    const databaseService = {
      queryRows: vi.fn().mockResolvedValue([
        {
          id: "notification-id",
          type: "listing_contact_request",
          payload: {
            contactRequestId: "request-id",
          },
          read_at: null,
          created_at: "2026-05-01T10:00:00.000Z",
        },
      ]),
    } as unknown as DatabaseService
    const service = new NotificationsService(databaseService)

    await service.createListingContactRequestNotification("owner-id", {
      contactRequestId: "request-id",
      emailShared: true,
      listingId: "listing-id",
      listingTitle: "Micia cerca casa",
      phoneShared: false,
      requesterDisplayName: "Requester",
      requesterUserId: "requester-id",
      status: "sent",
    })

    const [, type, payload] =
      vi.mocked(databaseService.queryRows).mock.calls[0]?.[1] ?? []

    expect(type).toBe("listing_contact_request")
    expect(JSON.parse(String(payload))).toEqual({
      contactRequestId: "request-id",
      emailShared: true,
      listingId: "listing-id",
      listingTitle: "Micia cerca casa",
      phoneShared: false,
      requesterDisplayName: "Requester",
      requesterUserId: "requester-id",
      status: "sent",
    })
  })
})

function nextTick() {
  return new Promise((resolve) => {
    setTimeout(resolve, 0)
  })
}
