import {
  BadRequestException,
  ForbiddenException,
  UnauthorizedException,
} from "@nestjs/common"
import { describe, expect, it, vi } from "vitest"

import type { ApiEnv } from "../config/env.js"
import type { DatabaseService } from "../database/database.service.js"
import type { MailService } from "../mail/mail.service.js"
import {
  AuthService,
  hashEmailVerificationToken,
  hashPassword,
  hashPasswordResetToken,
  hashSessionToken,
  normalizeEmail,
  verifyPassword,
} from "./auth.service.js"

describe("AuthService", () => {
  it("hashes and verifies passwords", async () => {
    const passwordHash = await hashPassword("correct horse battery")

    expect(passwordHash).toMatch(/^scrypt\$/)
    await expect(
      verifyPassword("correct horse battery", passwordHash)
    ).resolves.toBe(true)
    await expect(verifyPassword("wrong password", passwordHash)).resolves.toBe(
      false
    )
  })

  it("normalizes email addresses", () => {
    expect(normalizeEmail("  USER@Example.COM ")).toBe("user@example.com")
  })

  it("registers a user and returns the clear session token once", async () => {
    const databaseService = {
      queryRows: vi
        .fn()
        .mockResolvedValueOnce([
          {
            id: "user-id",
            email: "USER@Example.COM",
            display_name: "Emanuele",
            profile_type: "private",
            status: "pending_verification",
            session_id: "session-id",
            expires_at: "2026-05-30T10:00:00.000Z",
          },
        ])
        .mockResolvedValueOnce([
          {
            id: "user-id",
            email: "USER@Example.COM",
            display_name: "Emanuele",
            email_verified_at: null,
            token_id: "verification-token-id",
            expires_at: "2026-04-30T11:00:00.000Z",
          },
        ]),
    } as unknown as DatabaseService
    const { mailService, service } = createService(databaseService)

    const response = await service.register({
      email: "USER@Example.COM",
      password: "a strong password",
      displayName: "Emanuele",
      profileType: "private",
      showPhoneOnListings: false,
    })
    const [, parameters = []] = vi.mocked(databaseService.queryRows).mock
      .calls[0]!

    expect(parameters[0]).toBe("USER@Example.COM")
    expect(parameters[1]).toBe("user@example.com")
    expect(parameters[3]).toBe("Emanuele")
    expect(parameters[4]).toBe("private")
    expect(parameters[5]).toBeNull()
    expect(parameters[6]).toBe(false)
    expect(parameters[7]).toBe(hashSessionToken(response.session.token))
    expect(parameters[8]).toEqual(expect.any(String))
    await expect(
      verifyPassword("a strong password", String(parameters[2]))
    ).resolves.toBe(true)
    expect(response).toMatchObject({
      user: {
        id: "user-id",
        email: "USER@Example.COM",
        displayName: "Emanuele",
        profileType: "private",
        status: "pending_verification",
      },
      session: {
        id: "session-id",
        expiresAt: "2026-05-30T10:00:00.000Z",
      },
    })
    expect(response.session.token).toEqual(expect.any(String))
    expect(mailService.sendEmailVerification).toHaveBeenCalledWith({
      displayName: "Emanuele",
      expiresAt: "2026-04-30T11:00:00.000Z",
      to: "USER@Example.COM",
      token: expect.any(String),
    })
  })

  it("logs in with a valid password and creates a session", async () => {
    const passwordHash = await hashPassword("a strong password")
    const databaseService = {
      queryRows: vi
        .fn()
        .mockResolvedValueOnce([
          {
            id: "user-id",
            email: "user@example.com",
            display_name: "Emanuele",
            profile_type: "private",
            status: "active",
            password_hash: passwordHash,
          },
        ])
        .mockResolvedValueOnce([
          {
            session_id: "session-id",
            expires_at: "2026-05-30T10:00:00.000Z",
          },
        ]),
    } as unknown as DatabaseService
    const { service } = createService(databaseService)

    const response = await service.login({
      email: "USER@example.com",
      password: "a strong password",
    })
    const [, sessionParameters = []] = vi.mocked(databaseService.queryRows).mock
      .calls[1]!

    expect(sessionParameters[0]).toBe("user-id")
    expect(sessionParameters[1]).toBe(hashSessionToken(response.session.token))
    expect(sessionParameters[2]).toEqual(expect.any(String))
    expect(response.user.status).toBe("active")
    expect(response.session.id).toBe("session-id")
  })

  it("rejects invalid login credentials", async () => {
    const passwordHash = await hashPassword("a strong password")
    const databaseService = {
      queryRows: vi.fn().mockResolvedValue([
        {
          id: "user-id",
          email: "user@example.com",
          display_name: "Emanuele",
          profile_type: "private",
          status: "active",
          password_hash: passwordHash,
        },
      ]),
    } as unknown as DatabaseService
    const { service } = createService(databaseService)

    await expect(
      service.login({
        email: "user@example.com",
        password: "wrong password",
      })
    ).rejects.toBeInstanceOf(UnauthorizedException)
    expect(databaseService.queryRows).toHaveBeenCalledTimes(1)
  })

  it("rejects suspended users", async () => {
    const passwordHash = await hashPassword("a strong password")
    const databaseService = {
      queryRows: vi.fn().mockResolvedValue([
        {
          id: "user-id",
          email: "user@example.com",
          display_name: "Emanuele",
          profile_type: "private",
          status: "suspended",
          password_hash: passwordHash,
        },
      ]),
    } as unknown as DatabaseService
    const { service } = createService(databaseService)

    await expect(
      service.login({
        email: "user@example.com",
        password: "a strong password",
      })
    ).rejects.toBeInstanceOf(ForbiddenException)
  })

  it("returns the current session without exposing a token", async () => {
    const databaseService = {
      queryRows: vi.fn().mockResolvedValue([
        {
          id: "user-id",
          email: "user@example.com",
          display_name: "Emanuele",
          profile_type: "private",
          status: "active",
          session_id: "session-id",
          expires_at: "2026-05-30T10:00:00.000Z",
        },
      ]),
    } as unknown as DatabaseService
    const { service } = createService(databaseService)

    const response = await service.currentSession("clear-token")

    expect(response.session).toEqual({
      id: "session-id",
      expiresAt: "2026-05-30T10:00:00.000Z",
    })
    expect(response.session).not.toHaveProperty("token")
    const [, currentSessionParameters = []] = vi.mocked(
      databaseService.queryRows
    ).mock.calls[0]!

    expect(currentSessionParameters[0]).toBe(hashSessionToken("clear-token"))
  })

  it("revokes a session by hashed token", async () => {
    const databaseService = {
      queryRows: vi.fn().mockResolvedValue([{ id: "session-id" }]),
    } as unknown as DatabaseService
    const { service } = createService(databaseService)

    await expect(service.logout("clear-token")).resolves.toEqual({
      revoked: true,
    })
    const [, logoutParameters = []] = vi.mocked(databaseService.queryRows).mock
      .calls[0]!

    expect(logoutParameters[0]).toBe(hashSessionToken("clear-token"))
  })

  it("requests an email verification token", async () => {
    const databaseService = {
      queryRows: vi.fn().mockResolvedValue([
        {
          id: "user-id",
          email: "user@example.com",
          display_name: "Emanuele",
          email_verified_at: null,
          token_id: "token-id",
          expires_at: "2026-04-30T11:00:00.000Z",
        },
      ]),
    } as unknown as DatabaseService
    const { mailService, service } = createService(databaseService)

    await expect(service.requestEmailVerification("user-id")).resolves.toEqual({
      alreadyVerified: false,
      expiresAt: "2026-04-30T11:00:00.000Z",
      sent: true,
    })
    const [, parameters = []] = vi.mocked(databaseService.queryRows).mock
      .calls[0]!

    expect(parameters[0]).toBe("user-id")
    expect(parameters[1]).toEqual(expect.any(String))
    expect(parameters[2]).toEqual(expect.any(String))
    expect(mailService.sendEmailVerification).toHaveBeenCalledWith({
      displayName: "Emanuele",
      expiresAt: "2026-04-30T11:00:00.000Z",
      to: "user@example.com",
      token: expect.any(String),
    })
  })

  it("does not send verification email for already verified users", async () => {
    const databaseService = {
      queryRows: vi.fn().mockResolvedValue([
        {
          id: "user-id",
          email: "user@example.com",
          display_name: "Emanuele",
          email_verified_at: "2026-04-30T10:00:00.000Z",
          token_id: null,
          expires_at: null,
        },
      ]),
    } as unknown as DatabaseService
    const { mailService, service } = createService(databaseService)

    await expect(service.requestEmailVerification("user-id")).resolves.toEqual({
      alreadyVerified: true,
      expiresAt: null,
      sent: false,
    })
    expect(mailService.sendEmailVerification).not.toHaveBeenCalled()
  })

  it("verifies an email token once", async () => {
    const databaseService = {
      queryRows: vi.fn().mockResolvedValue([
        {
          id: "user-id",
          email: "user@example.com",
          display_name: "Emanuele",
          profile_type: "private",
          status: "active",
          email_verified_at: "2026-04-30T10:00:00.000Z",
        },
      ]),
    } as unknown as DatabaseService
    const { service } = createService(databaseService)

    await expect(
      service.verifyEmail({ token: "clear-verification-token" })
    ).resolves.toEqual({
      emailVerifiedAt: "2026-04-30T10:00:00.000Z",
      user: {
        id: "user-id",
        email: "user@example.com",
        displayName: "Emanuele",
        profileType: "private",
        status: "active",
      },
      verified: true,
    })
    const [, parameters = []] = vi.mocked(databaseService.queryRows).mock
      .calls[0]!

    expect(parameters[0]).toBe(
      hashEmailVerificationToken("clear-verification-token")
    )
  })

  it("rejects invalid email verification tokens", async () => {
    const databaseService = {
      queryRows: vi.fn().mockResolvedValue([]),
    } as unknown as DatabaseService
    const { service } = createService(databaseService)

    await expect(
      service.verifyEmail({ token: "invalid-verification-token" })
    ).rejects.toBeInstanceOf(BadRequestException)
  })

  it("requests a password reset token without exposing it in storage", async () => {
    const databaseService = {
      queryRows: vi.fn().mockResolvedValue([
        {
          id: "user-id",
          email: "user@example.com",
          display_name: "Emanuele",
          token_id: "reset-token-id",
          expires_at: "2026-04-30T10:30:00.000Z",
        },
      ]),
    } as unknown as DatabaseService
    const { mailService, service } = createService(databaseService)

    await expect(
      service.requestPasswordReset({ email: " USER@example.com " })
    ).resolves.toEqual({ sent: true })
    const [, parameters = []] = vi.mocked(databaseService.queryRows).mock
      .calls[0]!
    const resetMessage = vi.mocked(mailService.sendPasswordReset).mock
      .calls[0]![0]

    expect(parameters[0]).toBe("user@example.com")
    expect(parameters[1]).toBe(hashPasswordResetToken(resetMessage.token))
    expect(parameters[2]).toEqual(expect.any(String))
    expect(mailService.sendPasswordReset).toHaveBeenCalledWith({
      displayName: "Emanuele",
      expiresAt: "2026-04-30T10:30:00.000Z",
      to: "user@example.com",
      token: expect.any(String),
    })
  })

  it("returns a generic password reset response for unknown emails", async () => {
    const databaseService = {
      queryRows: vi.fn().mockResolvedValue([]),
    } as unknown as DatabaseService
    const { mailService, service } = createService(databaseService)

    await expect(
      service.requestPasswordReset({ email: "unknown@example.com" })
    ).resolves.toEqual({ sent: true })

    expect(mailService.sendPasswordReset).not.toHaveBeenCalled()
  })

  it("resets a password with a valid token", async () => {
    const databaseService = {
      queryRows: vi
        .fn()
        .mockResolvedValueOnce([{ id: "reset-token-id" }])
        .mockResolvedValueOnce([{ id: "user-id" }]),
    } as unknown as DatabaseService
    const { service } = createService(databaseService)

    await expect(
      service.resetPassword({
        token: "clear-password-reset-token",
        password: "a stronger password",
      })
    ).resolves.toEqual({ reset: true })
    const [, lookupParameters = []] = vi.mocked(databaseService.queryRows).mock
      .calls[0]!
    const [, resetParameters = []] = vi.mocked(databaseService.queryRows).mock
      .calls[1]!

    expect(lookupParameters[0]).toBe(
      hashPasswordResetToken("clear-password-reset-token")
    )
    expect(resetParameters[0]).toBe("reset-token-id")
    expect(resetParameters[1]).toBe(
      hashPasswordResetToken("clear-password-reset-token")
    )
    await expect(
      verifyPassword("a stronger password", String(resetParameters[2]))
    ).resolves.toBe(true)
  })

  it("rejects invalid password reset tokens", async () => {
    const databaseService = {
      queryRows: vi.fn().mockResolvedValue([]),
    } as unknown as DatabaseService
    const { service } = createService(databaseService)

    await expect(
      service.resetPassword({
        token: "invalid-password-reset-token",
        password: "a stronger password",
      })
    ).rejects.toBeInstanceOf(BadRequestException)
    expect(databaseService.queryRows).toHaveBeenCalledTimes(1)
  })

  it("changes a password and rotates the session", async () => {
    const passwordHash = await hashPassword("current password")
    const databaseService = {
      queryRows: vi
        .fn()
        .mockResolvedValueOnce([
          {
            id: "user-id",
            email: "user@example.com",
            display_name: "Emanuele",
            profile_type: "private",
            status: "active",
            password_hash: passwordHash,
          },
        ])
        .mockResolvedValueOnce([
          {
            session_id: "new-session-id",
            expires_at: "2026-05-30T10:00:00.000Z",
          },
        ]),
    } as unknown as DatabaseService
    const { service } = createService(databaseService)

    const response = await service.changePassword("user-id", {
      currentPassword: "current password",
      password: "a changed password",
    })
    const [, lookupParameters = []] = vi.mocked(databaseService.queryRows).mock
      .calls[0]!
    const [, changeParameters = []] = vi.mocked(databaseService.queryRows).mock
      .calls[1]!

    expect(response).toMatchObject({
      changed: true,
      session: {
        id: "new-session-id",
        expiresAt: "2026-05-30T10:00:00.000Z",
      },
    })
    expect(response.session.token).toEqual(expect.any(String))
    expect(lookupParameters[0]).toBe("user-id")
    expect(changeParameters[0]).toBe("user-id")
    await expect(
      verifyPassword("a changed password", String(changeParameters[1]))
    ).resolves.toBe(true)
    expect(changeParameters[2]).toBe(hashSessionToken(response.session.token))
    expect(changeParameters[3]).toEqual(expect.any(String))
  })

  it("rejects password changes with the wrong current password", async () => {
    const passwordHash = await hashPassword("current password")
    const databaseService = {
      queryRows: vi.fn().mockResolvedValue([
        {
          id: "user-id",
          email: "user@example.com",
          display_name: "Emanuele",
          profile_type: "private",
          status: "active",
          password_hash: passwordHash,
        },
      ]),
    } as unknown as DatabaseService
    const { service } = createService(databaseService)

    await expect(
      service.changePassword("user-id", {
        currentPassword: "wrong password",
        password: "a changed password",
      })
    ).rejects.toBeInstanceOf(UnauthorizedException)
    expect(databaseService.queryRows).toHaveBeenCalledTimes(1)
  })

  it("rejects password changes for accounts without a local password", async () => {
    const databaseService = {
      queryRows: vi.fn().mockResolvedValue([
        {
          id: "user-id",
          email: "user@example.com",
          display_name: "Emanuele",
          profile_type: "private",
          status: "active",
          password_hash: null,
        },
      ]),
    } as unknown as DatabaseService
    const { service } = createService(databaseService)

    await expect(
      service.changePassword("user-id", {
        currentPassword: "current password",
        password: "a changed password",
      })
    ).rejects.toBeInstanceOf(BadRequestException)
    expect(databaseService.queryRows).toHaveBeenCalledTimes(1)
  })
})

const testEnv: ApiEnv = {
  API_GLOBAL_RATE_LIMIT_PER_MINUTE: 1200,
  API_PORT: 4000,
  API_TRUST_PROXY: false,
  APP_ENV: "test",
  APP_URL: "http://localhost:3000",
  DATABASE_URL:
    "postgresql://adottaungatto:adottaungatto@localhost:5432/adottaungatto",
  EMAIL_VERIFICATION_TTL_MINUTES: 60,
  LISTING_LIMIT_DEFAULT_ACTIVE: 5,
  LISTING_LIMIT_ORGANIZATION_ACTIVE: 50,
  LISTING_PUBLISHED_TTL_DAYS: 60,
  MAIL_FROM: "no-reply@adottaungatto.local",
  MAIL_HOST: "localhost",
  MAIL_PORT: 1025,
  OBSERVABILITY_ALERT_ERROR_RATE_THRESHOLD: 0.05,
  OBSERVABILITY_ALERT_IN_FLIGHT_THRESHOLD: 50,
  OBSERVABILITY_ALERT_MIN_REQUESTS: 20,
  OBSERVABILITY_ALERT_P95_MS_THRESHOLD: 1000,
  PASSWORD_RESET_TTL_MINUTES: 30,
  PHONE_VERIFICATION_TTL_MINUTES: 10,
  RATE_LIMIT_ENABLED: true,
  RATE_LIMIT_LIMIT_MULTIPLIER: 1,
  RATE_LIMIT_WINDOW_MULTIPLIER: 1,
  REDIS_URL: "redis://localhost:6379",
  S3_ACCESS_KEY_ID: "minioadmin",
  S3_BUCKET: "adottaungatto-local",
  S3_ENDPOINT: "http://localhost:9000",
  S3_PUBLIC_ENDPOINT: "http://localhost:9000",
  S3_REGION: "local",
  S3_SECRET_ACCESS_KEY: "minioadmin",
}

function createService(databaseService: DatabaseService) {
  const mailService = {
    sendEmailVerification: vi.fn().mockResolvedValue(undefined),
    sendPasswordReset: vi.fn().mockResolvedValue(undefined),
  } as unknown as MailService

  return {
    mailService,
    service: new AuthService(databaseService, mailService, testEnv),
  }
}
