import { BadRequestException } from "@nestjs/common"
import { describe, expect, it, vi } from "vitest"

import { AuthController } from "./auth.controller.js"
import type { AuthService } from "./auth.service.js"
import type { AuthRateLimitRequest } from "./auth-rate-limit.js"
import type { RateLimitService } from "../rate-limit/rate-limit.service.js"

describe("AuthController", () => {
  it("validates registration payloads and delegates", async () => {
    const authService = {
      register: vi.fn().mockResolvedValue({ user: {}, session: {} }),
    } as unknown as AuthService
    const rateLimitService = createRateLimitService()
    const controller = createController(authService, rateLimitService)

    await controller.register(
      {
        email: " user@example.com ",
        password: "a strong password",
        displayName: " Emanuele ",
      },
      createRequest()
    )

    expect(authService.register).toHaveBeenCalledWith({
      email: "user@example.com",
      password: "a strong password",
      displayName: "Emanuele",
      profileType: "private",
      showPhoneOnListings: false,
    })
    expect(rateLimitService.enforce).toHaveBeenCalledWith([
      expect.objectContaining({
        namespace: "auth:register:ip",
        reason: "auth_register_ip_limit",
      }),
      expect.objectContaining({
        namespace: "auth:register:email",
        reason: "auth_register_email_limit",
      }),
    ])
  })

  it("rejects invalid registration payloads", async () => {
    const authService = {
      register: vi.fn(),
    } as unknown as AuthService
    const controller = createController(authService)

    await expect(
      controller.register(
        {
          email: "invalid",
          password: "short",
          displayName: "Emanuele",
        },
        createRequest()
      )
    ).rejects.toBeInstanceOf(BadRequestException)
  })

  it("validates login payloads and delegates", async () => {
    const authService = {
      login: vi.fn().mockResolvedValue({ user: {}, session: {} }),
    } as unknown as AuthService
    const controller = createController(authService)

    await controller.login(
      {
        email: " user@example.com ",
        password: "a strong password",
      },
      createRequest()
    )

    expect(authService.login).toHaveBeenCalledWith({
      email: "user@example.com",
      password: "a strong password",
    })
  })

  it("validates email verification payloads and delegates", async () => {
    const authService = {
      verifyEmail: vi.fn().mockResolvedValue({ verified: true }),
    } as unknown as AuthService
    const controller = createController(authService)

    await controller.verifyEmail(
      {
        token: "abcdefghijklmnopqrstuvwxyz123456",
      },
      createRequest()
    )

    expect(authService.verifyEmail).toHaveBeenCalledWith({
      token: "abcdefghijklmnopqrstuvwxyz123456",
    })
  })

  it("rejects invalid email verification payloads", async () => {
    const authService = {
      verifyEmail: vi.fn(),
    } as unknown as AuthService
    const controller = createController(authService)

    await expect(
      controller.verifyEmail(
        {
          token: "short",
        },
        createRequest()
      )
    ).rejects.toBeInstanceOf(BadRequestException)
  })

  it("validates password reset request payloads and delegates", async () => {
    const authService = {
      requestPasswordReset: vi.fn().mockResolvedValue({ sent: true }),
    } as unknown as AuthService
    const controller = createController(authService)

    await controller.requestPasswordReset(
      {
        email: " USER@example.com ",
      },
      createRequest()
    )

    expect(authService.requestPasswordReset).toHaveBeenCalledWith({
      email: "USER@example.com",
    })
  })

  it("rejects invalid password reset request payloads", async () => {
    const authService = {
      requestPasswordReset: vi.fn(),
    } as unknown as AuthService
    const controller = createController(authService)

    await expect(
      controller.requestPasswordReset(
        {
          email: "invalid",
        },
        createRequest()
      )
    ).rejects.toBeInstanceOf(BadRequestException)
  })

  it("validates password reset confirmation payloads and delegates", async () => {
    const authService = {
      resetPassword: vi.fn().mockResolvedValue({ reset: true }),
    } as unknown as AuthService
    const controller = createController(authService)

    await controller.resetPassword(
      {
        token: "abcdefghijklmnopqrstuvwxyz123456",
        password: "a stronger password",
      },
      createRequest()
    )

    expect(authService.resetPassword).toHaveBeenCalledWith({
      token: "abcdefghijklmnopqrstuvwxyz123456",
      password: "a stronger password",
    })
  })

  it("rejects invalid password reset confirmation payloads", async () => {
    const authService = {
      resetPassword: vi.fn(),
    } as unknown as AuthService
    const controller = createController(authService)

    await expect(
      controller.resetPassword(
        {
          token: "short",
          password: "short",
        },
        createRequest()
      )
    ).rejects.toBeInstanceOf(BadRequestException)
  })

  it("requests email verification for authenticated users", async () => {
    const authService = {
      requestEmailVerification: vi.fn().mockResolvedValue({ sent: true }),
    } as unknown as AuthService
    const controller = createController(authService)

    await controller.requestEmailVerification(createAuth(), createRequest())

    expect(authService.requestEmailVerification).toHaveBeenCalledWith("user-id")
  })

  it("validates authenticated password change payloads and delegates", async () => {
    const authService = {
      changePassword: vi.fn().mockResolvedValue({
        changed: true,
        session: {},
      }),
    } as unknown as AuthService
    const controller = createController(authService)

    await controller.changePassword(
      createAuth(),
      {
        currentPassword: "current password",
        password: "a changed password",
      },
      createRequest()
    )

    expect(authService.changePassword).toHaveBeenCalledWith("user-id", {
      currentPassword: "current password",
      password: "a changed password",
    })
  })

  it("rejects invalid authenticated password change payloads", async () => {
    const authService = {
      changePassword: vi.fn(),
    } as unknown as AuthService
    const controller = createController(authService)

    await expect(
      controller.changePassword(
        createAuth(),
        {
          currentPassword: "same password",
          password: "same password",
        },
        createRequest()
      )
    ).rejects.toBeInstanceOf(BadRequestException)
  })

  it("returns the guard-authenticated session", async () => {
    const authService = {
      currentSession: vi.fn(),
    } as unknown as AuthService
    const controller = createController(authService)
    const auth = createAuth()

    await expect(controller.me(auth)).resolves.toBe(auth)
    expect(authService.currentSession).not.toHaveBeenCalled()
  })

  it("passes authenticated tokens to logout", async () => {
    const authService = {
      logout: vi.fn().mockResolvedValue({ revoked: true }),
    } as unknown as AuthService
    const controller = createController(authService)

    await controller.logout("clear-token")

    expect(authService.logout).toHaveBeenCalledWith("clear-token")
  })
})

function createController(
  authService: AuthService,
  rateLimitService = createRateLimitService()
) {
  return new AuthController(authService, rateLimitService)
}

function createRateLimitService() {
  return {
    enforce: vi.fn().mockResolvedValue(undefined),
  } as unknown as RateLimitService
}

function createRequest(): AuthRateLimitRequest {
  return {
    ip: "127.0.0.1",
  }
}

function createAuth() {
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
  } as const
}
