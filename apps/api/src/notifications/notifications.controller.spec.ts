import { BadRequestException } from "@nestjs/common"
import { describe, expect, it, vi } from "vitest"

import type { CurrentAuthSessionResponse } from "../auth/auth.types.js"
import { NotificationsController } from "./notifications.controller.js"
import type { NotificationsService } from "./notifications.service.js"

describe("NotificationsController", () => {
  it("validates list queries and delegates", async () => {
    const notificationsService = {
      list: vi.fn().mockResolvedValue({ items: [], meta: {} }),
    } as unknown as NotificationsService
    const controller = new NotificationsController(notificationsService)

    await expect(
      controller.list(createAuth(), {
        page: "2",
        pageSize: "10",
        unreadOnly: "false",
      })
    ).resolves.toEqual({ items: [], meta: {} })

    expect(notificationsService.list).toHaveBeenCalledWith("user-id", {
      page: 2,
      pageSize: 10,
      unreadOnly: false,
    })
  })

  it("rejects invalid list queries", async () => {
    const notificationsService = {
      list: vi.fn(),
    } as unknown as NotificationsService
    const controller = new NotificationsController(notificationsService)

    await expect(
      controller.list(createAuth(), {
        page: "0",
      })
    ).rejects.toBeInstanceOf(BadRequestException)
    expect(notificationsService.list).not.toHaveBeenCalled()
  })

  it("loads the unread count", async () => {
    const notificationsService = {
      unreadCount: vi.fn().mockResolvedValue({ unreadCount: 3 }),
    } as unknown as NotificationsService
    const controller = new NotificationsController(notificationsService)

    await expect(controller.unreadCount(createAuth())).resolves.toEqual({
      unreadCount: 3,
    })
    expect(notificationsService.unreadCount).toHaveBeenCalledWith("user-id")
  })

  it("opens the authenticated notification stream", () => {
    const stream = { subscribe: vi.fn() }
    const notificationsService = {
      stream: vi.fn().mockReturnValue(stream),
    } as unknown as NotificationsService
    const controller = new NotificationsController(notificationsService)

    expect(controller.stream(createAuth())).toBe(stream)
    expect(notificationsService.stream).toHaveBeenCalledWith("user-id")
  })

  it("validates notification ids before marking read", async () => {
    const notificationsService = {
      markRead: vi.fn().mockResolvedValue({ id: "notification-id" }),
    } as unknown as NotificationsService
    const controller = new NotificationsController(notificationsService)

    await expect(
      controller.markRead(createAuth(), {
        notificationId: "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa",
      })
    ).resolves.toEqual({ id: "notification-id" })

    expect(notificationsService.markRead).toHaveBeenCalledWith(
      "user-id",
      "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa"
    )
  })

  it("rejects invalid notification ids", async () => {
    const notificationsService = {
      markRead: vi.fn(),
    } as unknown as NotificationsService
    const controller = new NotificationsController(notificationsService)

    await expect(
      controller.markRead(createAuth(), {
        notificationId: "invalid",
      })
    ).rejects.toBeInstanceOf(BadRequestException)
  })

  it("marks all notifications as read", async () => {
    const notificationsService = {
      markAllRead: vi.fn().mockResolvedValue({ updatedCount: 2 }),
    } as unknown as NotificationsService
    const controller = new NotificationsController(notificationsService)

    await expect(controller.markAllRead(createAuth())).resolves.toEqual({
      updatedCount: 2,
    })
    expect(notificationsService.markAllRead).toHaveBeenCalledWith("user-id")
  })

  it("validates notification ids before deleting", async () => {
    const notificationsService = {
      delete: vi.fn().mockResolvedValue({
        deleted: true,
        notificationId: "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa",
      }),
    } as unknown as NotificationsService
    const controller = new NotificationsController(notificationsService)

    await expect(
      controller.delete(createAuth(), {
        notificationId: "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa",
      })
    ).resolves.toEqual({
      deleted: true,
      notificationId: "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa",
    })

    expect(notificationsService.delete).toHaveBeenCalledWith(
      "user-id",
      "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa"
    )
  })

  it("rejects invalid notification ids before deleting", async () => {
    const notificationsService = {
      delete: vi.fn(),
    } as unknown as NotificationsService
    const controller = new NotificationsController(notificationsService)

    await expect(
      controller.delete(createAuth(), {
        notificationId: "invalid",
      })
    ).rejects.toBeInstanceOf(BadRequestException)
  })
})

function createAuth(): CurrentAuthSessionResponse {
  return {
    user: {
      id: "user-id",
      email: "user@example.com",
      displayName: "Emanuele",
      profileType: "private",
      status: "active",
    },
    session: {
      id: "session-id",
      expiresAt: "2026-05-30T10:00:00.000Z",
    },
  }
}
