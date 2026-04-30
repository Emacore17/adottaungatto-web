import { BadRequestException } from "@nestjs/common"
import { describe, expect, it, vi } from "vitest"

import { AuthController } from "./auth.controller.js"
import type { AuthService } from "./auth.service.js"

describe("AuthController", () => {
  it("validates registration payloads and delegates", async () => {
    const authService = {
      register: vi.fn().mockResolvedValue({ user: {}, session: {} }),
    } as unknown as AuthService
    const controller = new AuthController(authService)

    await controller.register({
      email: " user@example.com ",
      password: "a strong password",
      displayName: " Emanuele ",
    })

    expect(authService.register).toHaveBeenCalledWith({
      email: "user@example.com",
      password: "a strong password",
      displayName: "Emanuele",
      profileType: "private",
    })
  })

  it("rejects invalid registration payloads", async () => {
    const authService = {
      register: vi.fn(),
    } as unknown as AuthService
    const controller = new AuthController(authService)

    await expect(
      controller.register({
        email: "invalid",
        password: "short",
        displayName: "Emanuele",
      })
    ).rejects.toBeInstanceOf(BadRequestException)
  })

  it("validates login payloads and delegates", async () => {
    const authService = {
      login: vi.fn().mockResolvedValue({ user: {}, session: {} }),
    } as unknown as AuthService
    const controller = new AuthController(authService)

    await controller.login({
      email: " user@example.com ",
      password: "a strong password",
    })

    expect(authService.login).toHaveBeenCalledWith({
      email: "user@example.com",
      password: "a strong password",
    })
  })

  it("validates email verification payloads and delegates", async () => {
    const authService = {
      verifyEmail: vi.fn().mockResolvedValue({ verified: true }),
    } as unknown as AuthService
    const controller = new AuthController(authService)

    await controller.verifyEmail({
      token: "abcdefghijklmnopqrstuvwxyz123456",
    })

    expect(authService.verifyEmail).toHaveBeenCalledWith({
      token: "abcdefghijklmnopqrstuvwxyz123456",
    })
  })

  it("rejects invalid email verification payloads", async () => {
    const authService = {
      verifyEmail: vi.fn(),
    } as unknown as AuthService
    const controller = new AuthController(authService)

    await expect(
      controller.verifyEmail({
        token: "short",
      })
    ).rejects.toBeInstanceOf(BadRequestException)
  })

  it("validates password reset request payloads and delegates", async () => {
    const authService = {
      requestPasswordReset: vi.fn().mockResolvedValue({ sent: true }),
    } as unknown as AuthService
    const controller = new AuthController(authService)

    await controller.requestPasswordReset({
      email: " USER@example.com ",
    })

    expect(authService.requestPasswordReset).toHaveBeenCalledWith({
      email: "USER@example.com",
    })
  })

  it("rejects invalid password reset request payloads", async () => {
    const authService = {
      requestPasswordReset: vi.fn(),
    } as unknown as AuthService
    const controller = new AuthController(authService)

    await expect(
      controller.requestPasswordReset({
        email: "invalid",
      })
    ).rejects.toBeInstanceOf(BadRequestException)
  })

  it("validates password reset confirmation payloads and delegates", async () => {
    const authService = {
      resetPassword: vi.fn().mockResolvedValue({ reset: true }),
    } as unknown as AuthService
    const controller = new AuthController(authService)

    await controller.resetPassword({
      token: "abcdefghijklmnopqrstuvwxyz123456",
      password: "a stronger password",
    })

    expect(authService.resetPassword).toHaveBeenCalledWith({
      token: "abcdefghijklmnopqrstuvwxyz123456",
      password: "a stronger password",
    })
  })

  it("rejects invalid password reset confirmation payloads", async () => {
    const authService = {
      resetPassword: vi.fn(),
    } as unknown as AuthService
    const controller = new AuthController(authService)

    await expect(
      controller.resetPassword({
        token: "short",
        password: "short",
      })
    ).rejects.toBeInstanceOf(BadRequestException)
  })

  it("requests email verification for authenticated users", async () => {
    const authService = {
      requestEmailVerification: vi.fn().mockResolvedValue({ sent: true }),
    } as unknown as AuthService
    const controller = new AuthController(authService)

    await controller.requestEmailVerification(createAuth())

    expect(authService.requestEmailVerification).toHaveBeenCalledWith("user-id")
  })

  it("returns the guard-authenticated session", async () => {
    const authService = {
      currentSession: vi.fn(),
    } as unknown as AuthService
    const controller = new AuthController(authService)
    const auth = createAuth()

    await expect(controller.me(auth)).resolves.toBe(auth)
    expect(authService.currentSession).not.toHaveBeenCalled()
  })

  it("passes authenticated tokens to logout", async () => {
    const authService = {
      logout: vi.fn().mockResolvedValue({ revoked: true }),
    } as unknown as AuthService
    const controller = new AuthController(authService)

    await controller.logout("clear-token")

    expect(authService.logout).toHaveBeenCalledWith("clear-token")
  })
})

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
