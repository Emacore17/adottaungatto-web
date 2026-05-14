import { ForbiddenException, NotFoundException } from "@nestjs/common"
import { describe, expect, it, vi } from "vitest"

import type { DatabaseService } from "../database/database.service.js"
import { UsersService } from "./users.service.js"

describe("UsersService", () => {
  it("maps the current user profile", async () => {
    const databaseService = {
      queryRows: vi.fn().mockResolvedValue([
        {
          id: "user-id",
          email: "user@example.com",
          email_verified_at: "2026-04-01T10:00:00.000Z",
          display_name: "Emanuele",
          profile_type: "private",
          status: "active",
          phone_e164: "+39123456789",
          phone_verified_at: null,
          roles: ["registered_user"],
          listing_moderation_decision_email_enabled: true,
          listing_report_decision_email_enabled: false,
          created_at: "2026-04-01T09:00:00.000Z",
        },
      ]),
    } as unknown as DatabaseService
    const service = new UsersService(databaseService)

    await expect(service.currentProfile("user-id")).resolves.toEqual({
      id: "user-id",
      email: "user@example.com",
      emailVerifiedAt: "2026-04-01T10:00:00.000Z",
      displayName: "Emanuele",
      profileType: "private",
      status: "active",
      phoneE164: "+39123456789",
      phoneVerifiedAt: null,
      roles: ["registered_user"],
      notificationPreferences: {
        listingModerationDecisionEmail: true,
        listingReportDecisionEmail: false,
      },
      createdAt: "2026-04-01T09:00:00.000Z",
    })
    expect(databaseService.queryRows).toHaveBeenCalledWith(expect.any(String), [
      "user-id",
    ])
  })

  it("throws when the profile is missing", async () => {
    const databaseService = {
      queryRows: vi.fn().mockResolvedValue([]),
    } as unknown as DatabaseService
    const service = new UsersService(databaseService)

    await expect(service.currentProfile("missing-id")).rejects.toBeInstanceOf(
      NotFoundException
    )
  })

  it("updates editable profile fields", async () => {
    const databaseService = {
      queryRows: vi
        .fn()
        .mockResolvedValueOnce([
          {
            id: "user-id",
            email: "user@example.com",
            email_verified_at: null,
            display_name: "Old Name",
            profile_type: "private",
            status: "active",
            phone_e164: null,
            phone_verified_at: null,
            roles: ["registered_user"],
            listing_moderation_decision_email_enabled: true,
            listing_report_decision_email_enabled: true,
            created_at: "2026-04-01T09:00:00.000Z",
          },
        ])
        .mockResolvedValueOnce([{ id: "user-id" }])
        .mockResolvedValueOnce([
          {
            id: "user-id",
            email: "user@example.com",
            email_verified_at: null,
            display_name: "New Name",
            profile_type: "private",
            status: "active",
            phone_e164: "+39123456789",
            phone_verified_at: null,
            roles: ["registered_user"],
            listing_moderation_decision_email_enabled: true,
            listing_report_decision_email_enabled: true,
            created_at: "2026-04-01T09:00:00.000Z",
          },
        ]),
    } as unknown as DatabaseService
    const service = new UsersService(databaseService)

    await expect(
      service.updateCurrentProfile("user-id", {
        displayName: "New Name",
        phoneE164: "+39123456789",
      })
    ).resolves.toMatchObject({
      displayName: "New Name",
      phoneE164: "+39123456789",
    })

    expect(vi.mocked(databaseService.queryRows).mock.calls[1]?.[1]).toEqual([
      "user-id",
      "New Name",
      true,
      "+39123456789",
      null,
      null,
    ])
  })

  it("rejects self-service professional profile changes without a privileged role", async () => {
    const databaseService = {
      queryRows: vi.fn().mockResolvedValueOnce([
        {
          id: "user-id",
          email: "user@example.com",
          email_verified_at: null,
          display_name: "Emanuele",
          profile_type: "private",
          status: "active",
          phone_e164: null,
          phone_verified_at: null,
          roles: ["registered_user"],
          listing_moderation_decision_email_enabled: true,
          listing_report_decision_email_enabled: true,
          created_at: "2026-04-01T09:00:00.000Z",
        },
      ]),
    } as unknown as DatabaseService
    const service = new UsersService(databaseService)

    await expect(
      service.updateCurrentProfile("user-id", {
        profileType: "professional",
      })
    ).rejects.toBeInstanceOf(ForbiddenException)
    expect(databaseService.queryRows).toHaveBeenCalledTimes(1)
  })

  it("allows professional profile changes for privileged roles", async () => {
    const databaseService = {
      queryRows: vi
        .fn()
        .mockResolvedValueOnce([
          {
            id: "user-id",
            email: "user@example.com",
            email_verified_at: null,
            display_name: "Emanuele",
            profile_type: "private",
            status: "active",
            phone_e164: null,
            phone_verified_at: null,
            roles: ["professional_user", "registered_user"],
            listing_moderation_decision_email_enabled: true,
            listing_report_decision_email_enabled: true,
            created_at: "2026-04-01T09:00:00.000Z",
          },
        ])
        .mockResolvedValueOnce([{ id: "user-id" }])
        .mockResolvedValueOnce([
          {
            id: "user-id",
            email: "user@example.com",
            email_verified_at: null,
            display_name: "Emanuele",
            profile_type: "professional",
            status: "active",
            phone_e164: null,
            phone_verified_at: null,
            roles: ["professional_user", "registered_user"],
            listing_moderation_decision_email_enabled: true,
            listing_report_decision_email_enabled: true,
            created_at: "2026-04-01T09:00:00.000Z",
          },
        ]),
    } as unknown as DatabaseService
    const service = new UsersService(databaseService)

    await expect(
      service.updateCurrentProfile("user-id", {
        profileType: "professional",
      })
    ).resolves.toMatchObject({
      profileType: "professional",
    })
    expect(vi.mocked(databaseService.queryRows).mock.calls[1]?.[1]).toEqual([
      "user-id",
      null,
      false,
      null,
      null,
      "professional",
    ])
  })

  it("loads notification preferences", async () => {
    const databaseService = {
      queryRows: vi.fn().mockResolvedValue([
        {
          user_id: "user-id",
          listing_moderation_decision_email_enabled: true,
          listing_report_decision_email_enabled: false,
        },
      ]),
    } as unknown as DatabaseService
    const service = new UsersService(databaseService)

    await expect(
      service.currentNotificationPreferences("user-id")
    ).resolves.toEqual({
      listingModerationDecisionEmail: true,
      listingReportDecisionEmail: false,
    })
    expect(databaseService.queryRows).toHaveBeenCalledWith(expect.any(String), [
      "user-id",
    ])
  })

  it("updates notification preferences", async () => {
    const databaseService = {
      queryRows: vi.fn().mockResolvedValue([
        {
          user_id: "user-id",
          listing_moderation_decision_email_enabled: false,
          listing_report_decision_email_enabled: true,
        },
      ]),
    } as unknown as DatabaseService
    const service = new UsersService(databaseService)

    await expect(
      service.updateCurrentNotificationPreferences("user-id", {
        listingModerationDecisionEmail: false,
      })
    ).resolves.toEqual({
      listingModerationDecisionEmail: false,
      listingReportDecisionEmail: true,
    })
    expect(databaseService.queryRows).toHaveBeenCalledWith(expect.any(String), [
      "user-id",
      false,
      null,
    ])
  })

  it("throws when updating notification preferences for a missing user", async () => {
    const databaseService = {
      queryRows: vi.fn().mockResolvedValue([]),
    } as unknown as DatabaseService
    const service = new UsersService(databaseService)

    await expect(
      service.updateCurrentNotificationPreferences("missing-id", {
        listingReportDecisionEmail: false,
      })
    ).rejects.toBeInstanceOf(NotFoundException)
  })
})
