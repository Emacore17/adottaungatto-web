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
})
