import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from "@nestjs/common"
import { describe, expect, it, vi } from "vitest"

import type { DatabaseService } from "../database/database.service.js"
import type { ListingSearchDocumentsService } from "../listing-search-documents/listing-search-documents.service.js"
import type { MailService } from "../mail/mail.service.js"
import type { NotificationsService } from "../notifications/notifications.service.js"
import { ModerationService } from "./moderation.service.js"

describe("ModerationService", () => {
  it("lists pending-review items for moderators", async () => {
    const databaseService = {
      queryRows: vi.fn().mockResolvedValueOnce([
        {
          total_count: "1",
          case_id: "case-id",
          case_status: "open",
          case_reason_code: "listing_submission",
          case_created_at: "2026-04-01T10:00:00.000Z",
          assigned_to_user_id: null,
          listing_id: "listing-id",
          listing_title: "Gattino a Roma",
          listing_slug: "gattino-a-roma",
          listing_description: "Cerca una famiglia",
          listing_moderation_status: "pending_review",
          listing_lifecycle_status: "draft",
          listing_created_at: "2026-04-01T09:00:00.000Z",
          listing_updated_at: "2026-04-01T09:30:00.000Z",
          owner_user_id: "owner-id",
          owner_email: "owner@example.com",
          owner_display_name: "Owner",
          municipality_id: "municipality-id",
          municipality_name: "Roma",
          municipality_istat_code: "058091",
          province_id: "province-id",
          province_name: "Roma",
          province_istat_code: "058",
          region_id: "region-id",
          region_name: "Lazio",
          region_istat_code: "12",
          ready_image_count: "2",
          cover_image_id: "image-id",
          cover_object_key_thumb: "local/listings/listing-id/thumb/image.webp",
          cover_object_key_large: "local/listings/listing-id/large/image.webp",
          preview_images: [
            {
              id: "image-id",
              objectKeyThumb: "local/listings/listing-id/thumb/image.webp",
              objectKeyLarge: "local/listings/listing-id/large/image.webp",
              isCover: true,
              sortOrder: 0,
            },
            {
              id: "image-id-2",
              objectKeyThumb: "local/listings/listing-id/thumb/image-2.webp",
              objectKeyLarge: "local/listings/listing-id/large/image-2.webp",
              isCover: false,
              sortOrder: 1,
            },
          ],
          audit_actions: [
            {
              id: "action-id",
              action: "opened",
              reasonCode: "listing_submission",
              reasonText: "Invio a revisione.",
              fromStatus: "draft",
              toStatus: "pending_review",
              createdAt: "2026-04-01T10:00:00.000Z",
              actor: {
                id: "owner-id",
                email: "owner@example.com",
                displayName: "Owner",
              },
            },
          ],
        },
      ]),
    } as unknown as DatabaseService
    const { service } = createService(databaseService)

    await expect(
      service.pendingReviewQueue("moderator-id", {
        page: 2,
        pageSize: 10,
      })
    ).resolves.toEqual({
      items: [
        {
          case: {
            id: "case-id",
            status: "open",
            reasonCode: "listing_submission",
            openedAt: "2026-04-01T10:00:00.000Z",
            assignedToUserId: null,
            assignedTo: null,
          },
          listing: {
            id: "listing-id",
            title: "Gattino a Roma",
            slug: "gattino-a-roma",
            description: "Cerca una famiglia",
            moderationStatus: "pending_review",
            lifecycleStatus: "draft",
            createdAt: "2026-04-01T09:00:00.000Z",
            updatedAt: "2026-04-01T09:30:00.000Z",
          },
          owner: {
            id: "owner-id",
            email: "owner@example.com",
            displayName: "Owner",
          },
          location: {
            municipality: {
              id: "municipality-id",
              name: "Roma",
              istatCode: "058091",
            },
            province: {
              id: "province-id",
              name: "Roma",
              istatCode: "058",
            },
            region: {
              id: "region-id",
              name: "Lazio",
              istatCode: "12",
            },
          },
          images: {
            readyCount: 2,
            cover: {
              id: "image-id",
              objectKeyThumb: "local/listings/listing-id/thumb/image.webp",
              objectKeyLarge: "local/listings/listing-id/large/image.webp",
            },
            preview: [
              {
                id: "image-id",
                objectKeyThumb: "local/listings/listing-id/thumb/image.webp",
                objectKeyLarge: "local/listings/listing-id/large/image.webp",
                isCover: true,
                sortOrder: 0,
              },
              {
                id: "image-id-2",
                objectKeyThumb: "local/listings/listing-id/thumb/image-2.webp",
                objectKeyLarge: "local/listings/listing-id/large/image-2.webp",
                isCover: false,
                sortOrder: 1,
              },
            ],
          },
          audit: {
            actions: [
              {
                id: "action-id",
                action: "opened",
                reasonCode: "listing_submission",
                reasonText: "Invio a revisione.",
                fromStatus: "draft",
                toStatus: "pending_review",
                createdAt: "2026-04-01T10:00:00.000Z",
                actor: {
                  id: "owner-id",
                  email: "owner@example.com",
                  displayName: "Owner",
                },
              },
            ],
          },
        },
      ],
      meta: {
        page: 2,
        pageSize: 10,
        total: 1,
        totalPages: 1,
      },
    })
    expect(vi.mocked(databaseService.queryRows).mock.calls[0]?.[1]).toEqual([
      10, 10,
    ])
  })

  it("claims an open moderation case", async () => {
    const databaseService = {
      queryRows: vi.fn().mockResolvedValueOnce([
        {
          case_id: "case-id",
          previous_assigned_to_user_id: null,
          assigned_to_user_id: "moderator-id",
          updated_at: "2026-04-01T10:15:00.000Z",
          action_id: "action-id",
        },
      ]),
    } as unknown as DatabaseService
    const { service } = createService(databaseService)

    await expect(
      service.claimListingCase("moderator-id", "case-id")
    ).resolves.toEqual({
      claimed: true,
      action: {
        id: "action-id",
      },
      case: {
        id: "case-id",
        assignedToUserId: "moderator-id",
        updatedAt: "2026-04-01T10:15:00.000Z",
      },
    })
    expect(vi.mocked(databaseService.queryRows).mock.calls[0]?.[1]).toEqual([
      "case-id",
      "moderator-id",
    ])
  })

  it("rejects claim when another moderator already owns the case", async () => {
    const databaseService = {
      queryRows: vi.fn().mockResolvedValueOnce([
        {
          case_id: "case-id",
          previous_assigned_to_user_id: "other-moderator-id",
          assigned_to_user_id: null,
          updated_at: null,
          action_id: null,
        },
      ]),
    } as unknown as DatabaseService
    const { service } = createService(databaseService)

    await expect(
      service.claimListingCase("moderator-id", "case-id")
    ).rejects.toBeInstanceOf(ConflictException)
  })

  it("adds an internal moderation comment", async () => {
    const databaseService = {
      queryRows: vi.fn().mockResolvedValueOnce([
        {
          case_id: "case-id",
          case_status: "open",
          updated_at: "2026-04-01T10:20:00.000Z",
          action_id: "action-id",
          action_created_at: "2026-04-01T10:20:00.000Z",
          comment_text: "Controllare le immagini prima della decisione.",
        },
      ]),
    } as unknown as DatabaseService
    const { service } = createService(databaseService)

    await expect(
      service.commentListingCase("moderator-id", "case-id", {
        note: "Controllare le immagini prima della decisione.",
      })
    ).resolves.toEqual({
      commented: true,
      action: {
        id: "action-id",
        createdAt: "2026-04-01T10:20:00.000Z",
      },
      case: {
        id: "case-id",
        status: "open",
        updatedAt: "2026-04-01T10:20:00.000Z",
      },
      comment: {
        text: "Controllare le immagini prima della decisione.",
      },
    })
    expect(vi.mocked(databaseService.queryRows).mock.calls[0]?.[1]).toEqual([
      "case-id",
      "moderator-id",
      "Controllare le immagini prima della decisione.",
    ])
  })

  it("lists reported listings for moderators", async () => {
    const databaseService = {
      queryRows: vi.fn().mockResolvedValueOnce([
        {
          total_count: "1",
          case_id: "case-id",
          case_status: "open",
          case_reason_code: "user_report",
          case_created_at: "2026-04-01T10:00:00.000Z",
          assigned_to_user_id: "moderator-id",
          assigned_to_user_email: "moderator@example.com",
          assigned_to_user_display_name: "Moderator",
          listing_id: "listing-id",
          listing_title: "Gatto adulto a Milano",
          listing_slug: "gatto-adulto-a-milano",
          listing_description: "Annuncio pubblicato da verificare",
          listing_moderation_status: "approved",
          listing_lifecycle_status: "published",
          listing_published_at: "2026-03-25T10:00:00.000Z",
          listing_expires_at: null,
          listing_created_at: "2026-03-24T10:00:00.000Z",
          listing_updated_at: "2026-03-25T10:00:00.000Z",
          owner_user_id: "owner-id",
          owner_email: "owner@example.com",
          owner_display_name: "Owner",
          municipality_id: null,
          municipality_name: null,
          municipality_istat_code: null,
          province_id: null,
          province_name: null,
          province_istat_code: null,
          region_id: null,
          region_name: null,
          region_istat_code: null,
          ready_image_count: "1",
          cover_image_id: null,
          cover_object_key_thumb: null,
          cover_object_key_large: null,
          preview_images: [],
          report_count: "3",
          first_reported_at: "2026-04-01T10:00:00.000Z",
          latest_reported_at: "2026-04-01T12:00:00.000Z",
          latest_report_id: "report-id",
          latest_reporter_user_id: "reporter-id",
          latest_reporter_email: "reporter@example.com",
          latest_reporter_display_name: "Reporter",
          latest_report_reason_code: "suspected_scam",
          latest_report_description: "Richiesta sospetta.",
          latest_report_created_at: "2026-04-01T12:00:00.000Z",
          audit_actions: [
            {
              id: "action-id",
              action: "reported",
              reasonCode: "suspected_scam",
              reasonText: "Richiesta sospetta.",
              fromStatus: "approved",
              toStatus: "approved",
              createdAt: "2026-04-01T12:00:00.000Z",
              actor: {
                id: "reporter-id",
                email: "reporter@example.com",
                displayName: "Reporter",
              },
            },
          ],
        },
      ]),
    } as unknown as DatabaseService
    const { service } = createService(databaseService)

    await expect(
      service.reportedListingsQueue("moderator-id", {
        page: 3,
        pageSize: 5,
      })
    ).resolves.toEqual({
      items: [
        {
          case: {
            id: "case-id",
            status: "open",
            reasonCode: "user_report",
            openedAt: "2026-04-01T10:00:00.000Z",
            assignedToUserId: "moderator-id",
            assignedTo: {
              id: "moderator-id",
              email: "moderator@example.com",
              displayName: "Moderator",
            },
          },
          listing: {
            id: "listing-id",
            title: "Gatto adulto a Milano",
            slug: "gatto-adulto-a-milano",
            description: "Annuncio pubblicato da verificare",
            moderationStatus: "approved",
            lifecycleStatus: "published",
            publishedAt: "2026-03-25T10:00:00.000Z",
            expiresAt: null,
            createdAt: "2026-03-24T10:00:00.000Z",
            updatedAt: "2026-03-25T10:00:00.000Z",
          },
          owner: {
            id: "owner-id",
            email: "owner@example.com",
            displayName: "Owner",
          },
          location: null,
          images: {
            readyCount: 1,
            cover: null,
            preview: [],
          },
          audit: {
            actions: [
              {
                id: "action-id",
                action: "reported",
                reasonCode: "suspected_scam",
                reasonText: "Richiesta sospetta.",
                fromStatus: "approved",
                toStatus: "approved",
                createdAt: "2026-04-01T12:00:00.000Z",
                actor: {
                  id: "reporter-id",
                  email: "reporter@example.com",
                  displayName: "Reporter",
                },
              },
            ],
          },
          reports: {
            count: 3,
            firstReportedAt: "2026-04-01T10:00:00.000Z",
            latestReportedAt: "2026-04-01T12:00:00.000Z",
            latest: {
              id: "report-id",
              reporterUserId: "reporter-id",
              reporterEmail: "reporter@example.com",
              reporterDisplayName: "Reporter",
              reasonCode: "suspected_scam",
              description: "Richiesta sospetta.",
              createdAt: "2026-04-01T12:00:00.000Z",
            },
          },
        },
      ],
      meta: {
        page: 3,
        pageSize: 5,
        total: 1,
        totalPages: 1,
      },
    })
    expect(vi.mocked(databaseService.queryRows).mock.calls[0]?.[1]).toEqual([
      5, 10,
    ])
  })

  it("lists recent moderation actions for the dashboard", async () => {
    const databaseService = {
      queryRows: vi.fn().mockResolvedValueOnce([
        {
          total_count: "1",
          action_id: "action-id",
          action_type: "approved",
          action_reason_code: "policy_ok",
          action_reason_text: null,
          action_from_status: "pending_review",
          action_to_status: "approved",
          action_created_at: "2026-04-01T11:00:00.000Z",
          case_id: "case-id",
          case_status: "approved",
          assigned_to_user_id: "moderator-id",
          assigned_to_user_email: "moderator@example.com",
          assigned_to_user_display_name: "Moderator",
          listing_id: "listing-id",
          listing_title: "Gattino a Roma",
          listing_slug: "gattino-a-roma",
          listing_moderation_status: "approved",
          listing_lifecycle_status: "published",
          owner_user_id: "owner-id",
          owner_email: "owner@example.com",
          owner_display_name: "Owner",
          actor_user_id: "moderator-id",
          actor_email: "moderator@example.com",
          actor_display_name: "Moderator",
        },
      ]),
    } as unknown as DatabaseService
    const { service } = createService(databaseService)

    await expect(
      service.recentListingActions("moderator-id", {
        page: 1,
        pageSize: 8,
      })
    ).resolves.toEqual({
      items: [
        {
          action: {
            id: "action-id",
            type: "approved",
            reasonCode: "policy_ok",
            reasonText: null,
            fromStatus: "pending_review",
            toStatus: "approved",
            createdAt: "2026-04-01T11:00:00.000Z",
          },
          case: {
            id: "case-id",
            status: "approved",
            assignedToUserId: "moderator-id",
            assignedTo: {
              id: "moderator-id",
              email: "moderator@example.com",
              displayName: "Moderator",
            },
          },
          listing: {
            id: "listing-id",
            title: "Gattino a Roma",
            slug: "gattino-a-roma",
            moderationStatus: "approved",
            lifecycleStatus: "published",
          },
          owner: {
            id: "owner-id",
            email: "owner@example.com",
            displayName: "Owner",
          },
          actor: {
            id: "moderator-id",
            email: "moderator@example.com",
            displayName: "Moderator",
          },
        },
      ],
      meta: {
        page: 1,
        pageSize: 8,
        total: 1,
        totalPages: 1,
      },
    })
    expect(vi.mocked(databaseService.queryRows).mock.calls[0]?.[1]).toEqual([
      8, 0,
    ])
  })

  it("approves pending-review cases and writes an action", async () => {
    const databaseService = {
      queryRows: vi.fn().mockResolvedValueOnce([
        {
          case_id: "case-id",
          case_status: "approved",
          case_closed_at: "2026-04-01T11:00:00.000Z",
          action_id: "action-id",
          listing_id: "listing-id",
          listing_title: "Gattino a Roma",
          listing_slug: "gattino-a-roma",
          listing_moderation_status: "approved",
          listing_lifecycle_status: "published",
          listing_published_at: "2026-04-01T11:00:00.000Z",
          listing_updated_at: "2026-04-01T11:00:00.000Z",
          owner_user_id: "owner-id",
          owner_email: "owner@example.com",
          owner_display_name: "Owner",
          owner_listing_moderation_decision_email_enabled: true,
          report_resolution_status: "dismissed",
          report_resolution_count: "0",
          report_notifications: [],
        },
      ]),
    } as unknown as DatabaseService
    const {
      listingSearchDocumentsService,
      mailService,
      notificationsService,
      service,
    } = createService(databaseService)

    await expect(
      service.decideListingCase("moderator-id", "case-id", "approve", {
        reasonCode: "policy_ok",
      })
    ).resolves.toEqual({
      decided: true,
      decision: {
        action: "approved",
        reasonCode: "policy_ok",
        reasonText: null,
      },
      action: {
        id: "action-id",
      },
      case: {
        id: "case-id",
        status: "approved",
        closedAt: "2026-04-01T11:00:00.000Z",
      },
      listing: {
        id: "listing-id",
        moderationStatus: "approved",
        lifecycleStatus: "published",
        publishedAt: "2026-04-01T11:00:00.000Z",
        updatedAt: "2026-04-01T11:00:00.000Z",
      },
      reports: {
        status: "dismissed",
        count: 0,
      },
    })
    expect(mailService.sendListingModerationDecision).toHaveBeenCalledWith({
      decision: "approved",
      displayName: "Owner",
      listingSlug: "gattino-a-roma",
      listingTitle: "Gattino a Roma",
      reasonCode: "policy_ok",
      reasonText: null,
      to: "owner@example.com",
    })
    expect(
      notificationsService.createListingModerationDecisionNotification
    ).toHaveBeenCalledWith("owner-id", {
      caseId: "case-id",
      decision: "approved",
      listingId: "listing-id",
      listingSlug: "gattino-a-roma",
      listingTitle: "Gattino a Roma",
      reasonCode: "policy_ok",
      reasonText: null,
    })
    expect(mailService.sendListingReportDecision).not.toHaveBeenCalled()
    expect(listingSearchDocumentsService.refreshListing).toHaveBeenCalledWith(
      "listing-id"
    )
    expect(vi.mocked(databaseService.queryRows).mock.calls[0]?.[1]).toEqual([
      "case-id",
      "moderator-id",
      "approved",
      "published",
      "approved",
      "approved",
      "policy_ok",
      null,
      "dismissed",
      60,
      false,
    ])
  })

  it.each([
    ["reject", "rejected", "draft", "resolved"],
    ["suspend", "suspended", "draft", "resolved"],
  ] as const)(
    "%s pending-review cases with the expected target states",
    async (decision, moderationStatus, lifecycleStatus, reportStatus) => {
      const databaseService = {
        queryRows: vi.fn().mockResolvedValueOnce([
          {
            case_id: "case-id",
            case_status: moderationStatus,
            case_closed_at: "2026-04-01T11:00:00.000Z",
            action_id: "action-id",
            listing_id: "listing-id",
            listing_title: "Gattino a Roma",
            listing_slug: "gattino-a-roma",
            listing_moderation_status: moderationStatus,
            listing_lifecycle_status: lifecycleStatus,
            listing_published_at: null,
            listing_updated_at: "2026-04-01T11:00:00.000Z",
            owner_user_id: "owner-id",
            owner_email: "owner@example.com",
            owner_display_name: "Owner",
            owner_listing_moderation_decision_email_enabled: true,
            report_resolution_status: reportStatus,
            report_resolution_count: "2",
            report_notifications: [
              {
                reportId: "report-id",
                reporterUserId: "reporter-id",
                reporterEmail: "reporter@example.com",
                reporterDisplayName: "Reporter",
                listingReportDecisionEmailEnabled: true,
                reasonCode: "suspected_scam",
              },
            ],
          },
        ]),
      } as unknown as DatabaseService
      const {
        listingSearchDocumentsService,
        mailService,
        notificationsService,
        service,
      } = createService(databaseService)

      await expect(
        service.decideListingCase("moderator-id", "case-id", decision, {
          reasonText: "Contenuto non conforme.",
        })
      ).resolves.toMatchObject({
        reports: {
          status: reportStatus,
          count: 2,
        },
      })
      expect(mailService.sendListingModerationDecision).toHaveBeenCalledWith({
        decision: moderationStatus,
        displayName: "Owner",
        listingSlug: "gattino-a-roma",
        listingTitle: "Gattino a Roma",
        reasonCode: null,
        reasonText: "Contenuto non conforme.",
        to: "owner@example.com",
      })
      expect(mailService.sendListingReportDecision).toHaveBeenCalledWith({
        decision: moderationStatus,
        displayName: "Reporter",
        listingSlug: "gattino-a-roma",
        listingTitle: "Gattino a Roma",
        reasonCode: null,
        reasonText: "Contenuto non conforme.",
        reportResolutionStatus: reportStatus,
        to: "reporter@example.com",
      })
      expect(
        notificationsService.createListingReportDecisionNotification
      ).toHaveBeenCalledWith("reporter-id", {
        caseId: "case-id",
        decision: moderationStatus,
        listingId: "listing-id",
        listingSlug: "gattino-a-roma",
        listingTitle: "Gattino a Roma",
        reasonCode: null,
        reasonText: "Contenuto non conforme.",
        reportId: "report-id",
        reportResolutionStatus: reportStatus,
      })

      expect(vi.mocked(databaseService.queryRows).mock.calls[0]?.[1]).toEqual([
        "case-id",
        "moderator-id",
        moderationStatus,
        lifecycleStatus,
        moderationStatus,
        moderationStatus,
        null,
        "Contenuto non conforme.",
        reportStatus,
        60,
        false,
      ])
      expect(listingSearchDocumentsService.refreshListing).toHaveBeenCalledWith(
        "listing-id"
      )
    }
  )

  it("skips moderation decision email for opted-out listing owners", async () => {
    const databaseService = {
      queryRows: vi.fn().mockResolvedValueOnce([
        {
          case_id: "case-id",
          case_status: "rejected",
          case_closed_at: "2026-04-01T11:00:00.000Z",
          action_id: "action-id",
          listing_id: "listing-id",
          listing_title: "Gattino a Roma",
          listing_slug: "gattino-a-roma",
          listing_moderation_status: "rejected",
          listing_lifecycle_status: "draft",
          listing_published_at: null,
          listing_updated_at: "2026-04-01T11:00:00.000Z",
          owner_user_id: "owner-id",
          owner_email: "owner@example.com",
          owner_display_name: "Owner",
          owner_listing_moderation_decision_email_enabled: false,
          report_resolution_status: "resolved",
          report_resolution_count: "1",
          report_notifications: [
            {
              reportId: "report-id",
              reporterUserId: "reporter-id",
              reporterEmail: "reporter@example.com",
              reporterDisplayName: "Reporter",
              listingReportDecisionEmailEnabled: true,
              reasonCode: "suspected_scam",
            },
          ],
        },
      ]),
    } as unknown as DatabaseService
    const {
      listingSearchDocumentsService,
      mailService,
      notificationsService,
      service,
    } = createService(databaseService)

    await expect(
      service.decideListingCase("moderator-id", "case-id", "reject", {
        reasonText: "Contenuto non conforme.",
      })
    ).resolves.toMatchObject({
      decision: {
        action: "rejected",
      },
    })

    expect(
      notificationsService.createListingModerationDecisionNotification
    ).toHaveBeenCalledWith("owner-id", expect.any(Object))
    expect(mailService.sendListingModerationDecision).not.toHaveBeenCalled()
    expect(mailService.sendListingReportDecision).toHaveBeenCalledWith({
      decision: "rejected",
      displayName: "Reporter",
      listingSlug: "gattino-a-roma",
      listingTitle: "Gattino a Roma",
      reasonCode: null,
      reasonText: "Contenuto non conforme.",
      reportResolutionStatus: "resolved",
      to: "reporter@example.com",
    })
    expect(listingSearchDocumentsService.refreshListing).toHaveBeenCalledWith(
      "listing-id"
    )
  })

  it("rejects moderation decisions without a reason", async () => {
    const databaseService = {
      queryRows: vi.fn(),
    } as unknown as DatabaseService
    const { service } = createService(databaseService)

    await expect(
      service.decideListingCase("moderator-id", "case-id", "reject", {})
    ).rejects.toBeInstanceOf(BadRequestException)
    expect(databaseService.queryRows).not.toHaveBeenCalled()
  })

  it("returns not found when the case cannot be decided", async () => {
    const databaseService = {
      queryRows: vi.fn().mockResolvedValueOnce([]),
    } as unknown as DatabaseService
    const { service } = createService(databaseService)

    await expect(
      service.decideListingCase("moderator-id", "case-id", "approve", {
        reasonCode: "policy_ok",
      })
    ).rejects.toBeInstanceOf(NotFoundException)
  })

  it("rejects a moderator decision when another moderator owns the case", async () => {
    const databaseService = {
      queryRows: vi.fn().mockResolvedValueOnce([]).mockResolvedValueOnce([
        {
          case_id: "case-id",
          case_status: "open",
          assigned_to_user_id: "other-moderator-id",
          listing_id: "listing-id",
          listing_moderation_status: "pending_review",
          listing_lifecycle_status: "draft",
          listing_deleted: false,
          owner_deleted: false,
        },
      ]),
    } as unknown as DatabaseService
    const { listingSearchDocumentsService, service } =
      createService(databaseService)

    await expect(
      service.decideListingCase("moderator-id", "case-id", "approve", {
        reasonCode: "policy_ok",
      })
    ).rejects.toBeInstanceOf(ConflictException)
    expect(databaseService.queryRows).toHaveBeenCalledTimes(2)
    expect(listingSearchDocumentsService.refreshListing).not.toHaveBeenCalled()
  })

  it("allows admin decisions to override an existing case assignment", async () => {
    const databaseService = {
      queryRows: vi.fn().mockResolvedValueOnce([
        {
          case_id: "case-id",
          case_status: "approved",
          case_closed_at: "2026-04-01T11:00:00.000Z",
          action_id: "action-id",
          listing_id: "listing-id",
          listing_title: "Gattino a Roma",
          listing_slug: "gattino-a-roma",
          listing_moderation_status: "approved",
          listing_lifecycle_status: "published",
          listing_published_at: "2026-04-01T11:00:00.000Z",
          listing_updated_at: "2026-04-01T11:00:00.000Z",
          owner_user_id: "owner-id",
          owner_email: "owner@example.com",
          owner_display_name: "Owner",
          owner_listing_moderation_decision_email_enabled: true,
          report_resolution_status: "dismissed",
          report_resolution_count: "0",
          report_notifications: [],
        },
      ]),
    } as unknown as DatabaseService
    const { service } = createService(databaseService)

    await expect(
      service.decideListingCase(
        "admin-id",
        "case-id",
        "approve",
        {
          reasonCode: "policy_ok",
        },
        {
          canOverrideAssignment: true,
        }
      )
    ).resolves.toMatchObject({
      decided: true,
      case: {
        id: "case-id",
        status: "approved",
      },
      listing: {
        id: "listing-id",
        moderationStatus: "approved",
      },
    })
    expect(vi.mocked(databaseService.queryRows).mock.calls[0]?.[1]).toEqual([
      "case-id",
      "admin-id",
      "approved",
      "published",
      "approved",
      "approved",
      "policy_ok",
      null,
      "dismissed",
      60,
      true,
    ])
  })
})

function createService(databaseService: DatabaseService) {
  const listingSearchDocumentsService = {
    refreshListing: vi.fn().mockResolvedValue({
      listingId: "listing-id",
      found: true,
      indexed: true,
      deleted: false,
    }),
  } as unknown as ListingSearchDocumentsService
  const mailService = {
    sendListingModerationDecision: vi.fn().mockResolvedValue(undefined),
    sendListingReportDecision: vi.fn().mockResolvedValue(undefined),
  } as unknown as MailService
  const notificationsService = {
    createListingModerationDecisionNotification: vi
      .fn()
      .mockResolvedValue(undefined),
    createListingReportDecisionNotification: vi
      .fn()
      .mockResolvedValue(undefined),
  } as unknown as NotificationsService

  return {
    listingSearchDocumentsService,
    mailService,
    notificationsService,
    service: new ModerationService(
      databaseService,
      listingSearchDocumentsService,
      mailService,
      notificationsService
    ),
  }
}
