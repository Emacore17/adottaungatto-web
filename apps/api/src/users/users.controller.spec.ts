import { BadRequestException } from "@nestjs/common"
import { describe, expect, it, vi } from "vitest"

import type { CurrentAuthSessionResponse } from "../auth/auth.types.js"
import type { RateLimitService } from "../rate-limit/rate-limit.service.js"
import { UsersController } from "./users.controller.js"
import type { UsersRateLimitRequest } from "./users-rate-limit.js"
import type { UsersService } from "./users.service.js"

describe("UsersController", () => {
  it("loads the authenticated user's profile", async () => {
    const usersService = {
      currentProfile: vi.fn().mockResolvedValue({ id: "user-id" }),
    } as unknown as UsersService
    const controller = createController(usersService)
    const auth: CurrentAuthSessionResponse = {
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

    await expect(controller.me(auth)).resolves.toEqual({ id: "user-id" })

    expect(usersService.currentProfile).toHaveBeenCalledWith("user-id")
  })

  it("validates profile update payloads and delegates", async () => {
    const usersService = {
      updateCurrentProfile: vi.fn().mockResolvedValue({ id: "user-id" }),
    } as unknown as UsersService
    const controller = createController(usersService)
    const auth = createAuth()

    await expect(
      controller.updateMe(auth, {
        displayName: " New Name ",
        phoneE164: "+39123456789",
      })
    ).resolves.toEqual({ id: "user-id" })

    expect(usersService.updateCurrentProfile).toHaveBeenCalledWith("user-id", {
      displayName: "New Name",
      phoneE164: "+39123456789",
    })
  })

  it("rejects empty profile update payloads", async () => {
    const usersService = {
      updateCurrentProfile: vi.fn(),
    } as unknown as UsersService
    const controller = createController(usersService)

    await expect(controller.updateMe(createAuth(), {})).rejects.toBeInstanceOf(
      BadRequestException
    )
  })

  it("loads notification preferences", async () => {
    const usersService = {
      currentNotificationPreferences: vi.fn().mockResolvedValue({
        listingModerationDecisionEmail: true,
        listingReportDecisionEmail: false,
      }),
    } as unknown as UsersService
    const controller = createController(usersService)

    await expect(
      controller.notificationPreferences(createAuth())
    ).resolves.toEqual({
      listingModerationDecisionEmail: true,
      listingReportDecisionEmail: false,
    })

    expect(usersService.currentNotificationPreferences).toHaveBeenCalledWith(
      "user-id"
    )
  })

  it("validates notification preference updates and delegates", async () => {
    const usersService = {
      updateCurrentNotificationPreferences: vi
        .fn()
        .mockResolvedValue({ listingModerationDecisionEmail: false }),
    } as unknown as UsersService
    const controller = createController(usersService)

    await expect(
      controller.updateNotificationPreferences(createAuth(), {
        listingModerationDecisionEmail: false,
      })
    ).resolves.toEqual({ listingModerationDecisionEmail: false })

    expect(
      usersService.updateCurrentNotificationPreferences
    ).toHaveBeenCalledWith("user-id", {
      listingModerationDecisionEmail: false,
    })
  })

  it("rejects empty notification preference updates", async () => {
    const usersService = {
      updateCurrentNotificationPreferences: vi.fn(),
    } as unknown as UsersService
    const controller = createController(usersService)

    await expect(
      controller.updateNotificationPreferences(createAuth(), {})
    ).rejects.toBeInstanceOf(BadRequestException)
  })

  it("requests phone verification with rate limiting", async () => {
    const usersService = {
      requestPhoneVerification: vi.fn().mockResolvedValue({ sent: true }),
    } as unknown as UsersService
    const rateLimitService = createRateLimitService()
    const controller = createController(usersService, rateLimitService)

    await expect(
      controller.requestPhoneVerification(createAuth(), createRequest())
    ).resolves.toEqual({ sent: true })

    expect(rateLimitService.enforce).toHaveBeenCalled()
    expect(usersService.requestPhoneVerification).toHaveBeenCalledWith(
      "user-id"
    )
  })

  it("validates phone verification confirmation payloads", async () => {
    const usersService = {
      confirmPhoneVerification: vi.fn().mockResolvedValue({ verified: true }),
    } as unknown as UsersService
    const controller = createController(usersService)

    await expect(
      controller.confirmPhoneVerification(
        createAuth(),
        { code: "123456" },
        createRequest()
      )
    ).resolves.toEqual({ verified: true })

    expect(usersService.confirmPhoneVerification).toHaveBeenCalledWith(
      "user-id",
      { code: "123456" }
    )
  })

  it("rejects invalid phone verification codes", async () => {
    const usersService = {
      confirmPhoneVerification: vi.fn(),
    } as unknown as UsersService
    const controller = createController(usersService)

    await expect(
      controller.confirmPhoneVerification(
        createAuth(),
        { code: "12" },
        createRequest()
      )
    ).rejects.toBeInstanceOf(BadRequestException)
  })
})

function createController(
  usersService: UsersService,
  rateLimitService = createRateLimitService()
) {
  return new UsersController(usersService, rateLimitService)
}

function createRateLimitService() {
  return {
    enforce: vi.fn().mockResolvedValue(undefined),
  } as unknown as RateLimitService
}

function createRequest(): UsersRateLimitRequest {
  return {
    ip: "127.0.0.1",
  }
}

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
