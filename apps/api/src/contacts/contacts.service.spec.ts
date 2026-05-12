import {
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common"
import { describe, expect, it, vi } from "vitest"

import type { DatabaseService } from "../database/database.service.js"
import type { MailService } from "../mail/mail.service.js"
import type { NotificationsService } from "../notifications/notifications.service.js"
import { ContactsService } from "./contacts.service.js"

describe("ContactsService", () => {
  it("lists received contact requests for the owner only", async () => {
    const databaseService = {
      queryRows: vi.fn().mockResolvedValueOnce([
        {
          total_count: 1,
          id: "request-id",
          listing_id: "listing-id",
          listing_title: "Micia cerca casa",
          requester_user_id: "requester-id",
          requester_email: "requester@example.com",
          requester_phone_e164: "+39123456789",
          requester_display_name_snapshot: "Requester",
          message: "Ciao, vorrei avere informazioni sulla gatta.",
          status: "sent",
          email_shared: true,
          phone_shared: true,
          created_at: "2026-04-01T12:00:00.000Z",
          delivered_at: "2026-04-01T12:00:01.000Z",
          failed_at: null,
          failure_reason: null,
        },
      ]),
    } as unknown as DatabaseService
    const mailService = {
      sendListingContactRequest: vi.fn(),
    } as unknown as MailService
    const service = new ContactsService(databaseService, mailService)

    await expect(
      service.listReceivedContactRequests("owner-id", {
        page: 1,
        pageSize: 10,
      })
    ).resolves.toEqual({
      items: [
        {
          id: "request-id",
          listing: {
            id: "listing-id",
            title: "Micia cerca casa",
          },
          requester: {
            id: "requester-id",
            displayName: "Requester",
            email: "requester@example.com",
            phoneE164: "+39123456789",
          },
          message: "Ciao, vorrei avere informazioni sulla gatta.",
          status: "sent",
          emailShared: true,
          phoneShared: true,
          createdAt: "2026-04-01T12:00:00.000Z",
          deliveredAt: "2026-04-01T12:00:01.000Z",
          failedAt: null,
          failureReason: null,
        },
      ],
      meta: {
        page: 1,
        pageSize: 10,
        total: 1,
        totalPages: 1,
      },
    })
    expect(vi.mocked(databaseService.queryRows).mock.calls[0]?.[0]).toContain(
      "where contact_request.owner_user_id = $1::uuid"
    )
    expect(vi.mocked(databaseService.queryRows).mock.calls[0]?.[1]).toEqual([
      "owner-id",
      10,
      0,
    ])
  })

  it("creates and sends a contact request without exposing owner contact data", async () => {
    const databaseService = {
      queryRows: vi
        .fn()
        .mockResolvedValueOnce([
          {
            id: "listing-id",
            title: "Micia cerca casa",
            owner_user_id: "owner-id",
            owner_email: "owner@example.com",
            owner_display_name: "Owner",
          },
        ])
        .mockResolvedValueOnce([createRateLimitRow()])
        .mockResolvedValueOnce([{ id: "request-id" }])
        .mockResolvedValueOnce([
          {
            id: "request-id",
            listing_id: "listing-id",
            requester_user_id: "requester-id",
            owner_user_id: "owner-id",
            status: "sent",
            email_shared: true,
            phone_shared: false,
            created_at: "2026-04-01T12:00:00.000Z",
            delivered_at: "2026-04-01T12:00:01.000Z",
          },
        ]),
    } as unknown as DatabaseService
    const mailService = {
      sendListingContactRequest: vi.fn().mockResolvedValue(undefined),
    } as unknown as MailService
    const notificationsService = {
      createListingContactRequestNotification: vi.fn().mockResolvedValue({
        id: "notification-id",
      }),
    } as unknown as NotificationsService
    const service = new ContactsService(
      databaseService,
      mailService,
      notificationsService
    )

    await expect(
      service.contactListingOwner(
        {
          id: "requester-id",
          email: "requester@example.com",
          displayName: "Requester",
          profileType: "private",
          status: "active",
        },
        "listing-id",
        {
          message: "Ciao, vorrei avere informazioni sulla gatta.",
          shareEmail: true,
          sharePhone: false,
        }
      )
    ).resolves.toEqual({
      sent: true,
      request: {
        id: "request-id",
        listingId: "listing-id",
        requesterUserId: "requester-id",
        ownerUserId: "owner-id",
        status: "sent",
        emailShared: true,
        phoneShared: false,
        createdAt: "2026-04-01T12:00:00.000Z",
        deliveredAt: "2026-04-01T12:00:01.000Z",
      },
    })
    expect(mailService.sendListingContactRequest).toHaveBeenCalledWith({
      listingId: "listing-id",
      listingTitle: "Micia cerca casa",
      message: "Ciao, vorrei avere informazioni sulla gatta.",
      ownerDisplayName: "Owner",
      requesterDisplayName: "Requester",
      requesterEmail: "requester@example.com",
      to: "owner@example.com",
    })
    expect(vi.mocked(databaseService.queryRows).mock.calls[0]?.[0]).toContain(
      "listing.contact_requests_enabled = true"
    )
    expect(vi.mocked(databaseService.queryRows).mock.calls[1]?.[1]).toEqual([
      "requester-id",
      "listing-id",
      "owner-id",
      3600,
      86400,
    ])
    expect(vi.mocked(databaseService.queryRows).mock.calls[2]?.[1]).toEqual([
      "listing-id",
      "requester-id",
      "owner-id",
      "Requester",
      "Ciao, vorrei avere informazioni sulla gatta.",
      false,
    ])
    expect(
      notificationsService.createListingContactRequestNotification
    ).toHaveBeenCalledWith("owner-id", {
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

  it("stores and sends requester phone only after explicit consent", async () => {
    const databaseService = {
      queryRows: vi
        .fn()
        .mockResolvedValueOnce([
          {
            id: "listing-id",
            title: "Micia cerca casa",
            owner_user_id: "owner-id",
            owner_email: "owner@example.com",
            owner_display_name: "Owner",
          },
        ])
        .mockResolvedValueOnce([createRateLimitRow()])
        .mockResolvedValueOnce([{ phone_e164: "+39123456789" }])
        .mockResolvedValueOnce([{ id: "request-id" }])
        .mockResolvedValueOnce([
          {
            id: "request-id",
            listing_id: "listing-id",
            requester_user_id: "requester-id",
            owner_user_id: "owner-id",
            status: "sent",
            email_shared: true,
            phone_shared: true,
            created_at: "2026-04-01T12:00:00.000Z",
            delivered_at: "2026-04-01T12:00:01.000Z",
          },
        ]),
    } as unknown as DatabaseService
    const mailService = {
      sendListingContactRequest: vi.fn().mockResolvedValue(undefined),
    } as unknown as MailService
    const service = new ContactsService(databaseService, mailService)

    await expect(
      service.contactListingOwner(
        {
          id: "requester-id",
          email: "requester@example.com",
          displayName: "Requester",
          profileType: "private",
          status: "active",
        },
        "listing-id",
        {
          message: "Ciao, vorrei avere informazioni sulla gatta.",
          shareEmail: true,
          sharePhone: true,
        }
      )
    ).resolves.toMatchObject({
      request: {
        emailShared: true,
        phoneShared: true,
      },
      sent: true,
    })
    expect(mailService.sendListingContactRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        requesterEmail: "requester@example.com",
        requesterPhoneE164: "+39123456789",
      })
    )
    expect(vi.mocked(databaseService.queryRows).mock.calls[2]?.[1]).toEqual([
      "requester-id",
    ])
    expect(vi.mocked(databaseService.queryRows).mock.calls[3]?.[1]).toEqual([
      "listing-id",
      "requester-id",
      "owner-id",
      "Requester",
      "Ciao, vorrei avere informazioni sulla gatta.",
      true,
    ])
  })

  it("rejects phone sharing when the requester has no phone", async () => {
    const databaseService = {
      queryRows: vi
        .fn()
        .mockResolvedValueOnce([
          {
            id: "listing-id",
            title: "Micia cerca casa",
            owner_user_id: "owner-id",
            owner_email: "owner@example.com",
            owner_display_name: "Owner",
          },
        ])
        .mockResolvedValueOnce([createRateLimitRow()])
        .mockResolvedValueOnce([{ phone_e164: null }]),
    } as unknown as DatabaseService
    const mailService = {
      sendListingContactRequest: vi.fn(),
    } as unknown as MailService
    const service = new ContactsService(databaseService, mailService)

    await expect(
      service.contactListingOwner(
        {
          id: "requester-id",
          email: "requester@example.com",
          displayName: "Requester",
          profileType: "private",
          status: "active",
        },
        "listing-id",
        {
          message: "Ciao, vorrei avere informazioni sulla gatta.",
          shareEmail: true,
          sharePhone: true,
        }
      )
    ).rejects.toBeInstanceOf(BadRequestException)
    expect(mailService.sendListingContactRequest).not.toHaveBeenCalled()
  })

  it("rejects contact requests for own listings", async () => {
    const databaseService = {
      queryRows: vi.fn().mockResolvedValueOnce([
        {
          id: "listing-id",
          title: "Micia cerca casa",
          owner_user_id: "requester-id",
          owner_email: "requester@example.com",
          owner_display_name: "Requester",
        },
      ]),
    } as unknown as DatabaseService
    const mailService = {
      sendListingContactRequest: vi.fn(),
    } as unknown as MailService
    const service = new ContactsService(databaseService, mailService)

    await expect(
      service.contactListingOwner(
        {
          id: "requester-id",
          email: "requester@example.com",
          displayName: "Requester",
          profileType: "private",
          status: "active",
        },
        "listing-id",
        {
          message: "Ciao, vorrei avere informazioni sulla gatta.",
          shareEmail: true,
          sharePhone: false,
        }
      )
    ).rejects.toBeInstanceOf(BadRequestException)
    expect(mailService.sendListingContactRequest).not.toHaveBeenCalled()
  })

  it("rejects contact requests for non-public listings", async () => {
    const databaseService = {
      queryRows: vi.fn().mockResolvedValueOnce([]),
    } as unknown as DatabaseService
    const mailService = {
      sendListingContactRequest: vi.fn(),
    } as unknown as MailService
    const service = new ContactsService(databaseService, mailService)

    await expect(
      service.contactListingOwner(
        {
          id: "requester-id",
          email: "requester@example.com",
          displayName: "Requester",
          profileType: "private",
          status: "active",
        },
        "listing-id",
        {
          message: "Ciao, vorrei avere informazioni sulla gatta.",
          shareEmail: true,
          sharePhone: false,
        }
      )
    ).rejects.toBeInstanceOf(NotFoundException)
  })

  it("marks the request as failed when delivery fails", async () => {
    const databaseService = {
      queryRows: vi
        .fn()
        .mockResolvedValueOnce([
          {
            id: "listing-id",
            title: "Micia cerca casa",
            owner_user_id: "owner-id",
            owner_email: "owner@example.com",
            owner_display_name: "Owner",
          },
        ])
        .mockResolvedValueOnce([createRateLimitRow()])
        .mockResolvedValueOnce([{ id: "request-id" }])
        .mockResolvedValueOnce([{ id: "request-id" }]),
    } as unknown as DatabaseService
    const mailService = {
      sendListingContactRequest: vi.fn().mockRejectedValue(new Error("SMTP")),
    } as unknown as MailService
    const service = new ContactsService(databaseService, mailService)

    await expect(
      service.contactListingOwner(
        {
          id: "requester-id",
          email: "requester@example.com",
          displayName: "Requester",
          profileType: "private",
          status: "active",
        },
        "listing-id",
        {
          message: "Ciao, vorrei avere informazioni sulla gatta.",
          shareEmail: true,
          sharePhone: false,
        }
      )
    ).rejects.toBeInstanceOf(InternalServerErrorException)
    expect(vi.mocked(databaseService.queryRows).mock.calls[3]?.[1]).toEqual([
      "request-id",
      "SMTP",
    ])
  })

  it("rejects repeated contact requests for the same listing in the cooldown window", async () => {
    const databaseService = {
      queryRows: vi
        .fn()
        .mockResolvedValueOnce([
          {
            id: "listing-id",
            title: "Micia cerca casa",
            owner_user_id: "owner-id",
            owner_email: "owner@example.com",
            owner_display_name: "Owner",
          },
        ])
        .mockResolvedValueOnce([createRateLimitRow({ listing_day_count: 1 })]),
    } as unknown as DatabaseService
    const mailService = {
      sendListingContactRequest: vi.fn(),
    } as unknown as MailService
    const service = new ContactsService(databaseService, mailService)

    await expect(
      service.contactListingOwner(
        {
          id: "requester-id",
          email: "requester@example.com",
          displayName: "Requester",
          profileType: "private",
          status: "active",
        },
        "listing-id",
        {
          message: "Ciao, vorrei avere informazioni sulla gatta.",
          shareEmail: true,
          sharePhone: false,
        }
      )
    ).rejects.toMatchObject({
      status: 429,
      response: {
        reason: "listing_contact_cooldown",
        retryAfterSeconds: 86400,
      },
    })
    expect(mailService.sendListingContactRequest).not.toHaveBeenCalled()
  })

  it("rejects requester contact bursts over the hourly limit", async () => {
    const databaseService = {
      queryRows: vi
        .fn()
        .mockResolvedValueOnce([
          {
            id: "listing-id",
            title: "Micia cerca casa",
            owner_user_id: "owner-id",
            owner_email: "owner@example.com",
            owner_display_name: "Owner",
          },
        ])
        .mockResolvedValueOnce([
          createRateLimitRow({ requester_hour_count: 5 }),
        ]),
    } as unknown as DatabaseService
    const mailService = {
      sendListingContactRequest: vi.fn(),
    } as unknown as MailService
    const service = new ContactsService(databaseService, mailService)

    await expect(
      service.contactListingOwner(
        {
          id: "requester-id",
          email: "requester@example.com",
          displayName: "Requester",
          profileType: "private",
          status: "active",
        },
        "listing-id",
        {
          message: "Ciao, vorrei avere informazioni sulla gatta.",
          shareEmail: true,
          sharePhone: false,
        }
      )
    ).rejects.toMatchObject({
      status: 429,
      response: {
        reason: "requester_hourly_limit",
        retryAfterSeconds: 3600,
      },
    })
    expect(mailService.sendListingContactRequest).not.toHaveBeenCalled()
  })
})

function createRateLimitRow(
  overrides: Partial<{
    requester_hour_count: number
    requester_day_count: number
    listing_day_count: number
    owner_hour_count: number
  }> = {}
) {
  return {
    requester_hour_count: 0,
    requester_day_count: 0,
    listing_day_count: 0,
    owner_hour_count: 0,
    ...overrides,
  }
}
