import { BadRequestException, NotFoundException } from "@nestjs/common"
import { describe, expect, it, vi } from "vitest"

import type { DatabaseService } from "../database/database.service.js"
import type { NotificationsService } from "../notifications/notifications.service.js"
import type { ObjectStorageService } from "../storage/object-storage.service.js"
import { hashPassword, verifyPassword } from "../auth/auth.service.js"
import { createListingSlug, ListingsService } from "./listings.service.js"

describe("ListingsService", () => {
  it("normalizes listing titles into slugs", () => {
    expect(createListingSlug(" Gattino a Roma! ")).toBe("gattino-a-roma")
    expect(createListingSlug("!!!")).toBe("annuncio")
  })

  it("lists active public cat breeds ordered by the database", async () => {
    const databaseService = {
      queryRows: vi.fn().mockResolvedValue([
        {
          id: "breed-id",
          name: "Europeo",
          slug: "europeo",
        },
      ]),
    } as unknown as DatabaseService
    const { service } = createService(databaseService)

    await expect(service.listPublicCatBreeds()).resolves.toEqual([
      {
        id: "breed-id",
        name: "Europeo",
        slug: "europeo",
      },
    ])
    expect(databaseService.queryRows).toHaveBeenCalledWith(
      expect.any(String),
      []
    )
    expect(vi.mocked(databaseService.queryRows).mock.calls[0]?.[0]).toContain(
      "from cat_breeds"
    )
    expect(vi.mocked(databaseService.queryRows).mock.calls[0]?.[0]).toContain(
      "where is_active = true"
    )
  })

  it("lists public listings with filters and pagination metadata", async () => {
    const databaseService = {
      queryRows: vi.fn().mockResolvedValue([
        {
          ...createPublicListingRow(),
          total_count: "1",
        },
      ]),
    } as unknown as DatabaseService
    const { service } = createService(databaseService)

    await expect(
      service.listPublic({
        page: 2,
        pageSize: 10,
        q: "gattino roma",
        ageMonthsMin: 2,
        ageMonthsMax: 12,
        hasImages: true,
        hasMicrochip: false,
        isFree: true,
        regionId: "region-id",
        sex: "female",
      })
    ).resolves.toEqual({
      items: [
        expect.objectContaining({
          id: "listing-id",
          title: "Gattino a Roma",
          contactRequestsEnabled: true,
          publishedAt: "2026-04-20T10:00:00.000Z",
          createdAt: "2026-04-01T09:00:00.000Z",
          owner: {
            id: "owner-id",
            displayName: "Owner",
            profileType: "private",
          },
          stats: {
            favoriteCount: 3,
            likeCount: 4,
          },
          sponsorship: {
            isSponsored: false,
            label: null,
            placement: null,
          },
          images: {
            readyCount: 2,
            cover: {
              id: "cover-image-id",
              objectKeyLarge: "local/listings/listing-id/large/cover.webp",
              objectKeyThumb: "local/listings/listing-id/thumb/cover.webp",
              width: 1200,
              height: 800,
              blurHash: "blurhash",
              blurDataUrl: "data:image/webp;base64,AAAA",
              sortOrder: 0,
              isCover: true,
            },
            preview: [
              {
                id: "cover-image-id",
                objectKeyLarge: "local/listings/listing-id/large/cover.webp",
                objectKeyThumb: "local/listings/listing-id/thumb/cover.webp",
                width: 1200,
                height: 800,
                blurHash: "blurhash",
                blurDataUrl: "data:image/webp;base64,AAAA",
                sortOrder: 0,
                isCover: true,
              },
              {
                id: "second-image-id",
                objectKeyLarge: "local/listings/listing-id/large/second.webp",
                objectKeyThumb: "local/listings/listing-id/thumb/second.webp",
                width: 900,
                height: 1200,
                blurHash: null,
                blurDataUrl: null,
                sortOrder: 1,
                isCover: false,
              },
            ],
          },
        }),
      ],
      meta: {
        page: 2,
        pageSize: 10,
        total: 1,
        totalPages: 1,
        query: "gattino roma",
        sort: "relevance",
        rankingVersion: "postgres-v1",
        expansion: null,
      },
      suggestions: null,
    })
    expect(databaseService.queryRows).toHaveBeenCalledWith(expect.any(String), [
      10,
      10,
      null,
      null,
      null,
      "region-id",
      "female",
      2,
      12,
      true,
      null,
      null,
      null,
      false,
      true,
      "gattino roma",
      null,
      null,
      null,
      "relevance",
      null,
      null,
    ])
    expect(vi.mocked(databaseService.queryRows).mock.calls[0]?.[0]).toContain(
      "websearch_to_tsquery"
    )
    expect(vi.mocked(databaseService.queryRows).mock.calls[0]?.[0]).toContain(
      "listing_search_documents search_document"
    )
    expect(vi.mocked(databaseService.queryRows).mock.calls[0]?.[0]).toContain(
      "listing_promotions"
    )
    expect(vi.mocked(databaseService.queryRows).mock.calls[0]?.[0]).toContain(
      "search_document.quality_score"
    )
    expect(vi.mocked(databaseService.queryRows).mock.calls[0]?.[0]).toContain(
      "search_document.like_count"
    )
    expect(vi.mocked(databaseService.queryRows).mock.calls[0]?.[0]).toContain(
      "listing.contribution_cents"
    )
  })

  it("lists public listings sorted by distance around an origin", async () => {
    const databaseService = {
      queryRows: vi.fn().mockResolvedValue([
        {
          ...createPublicListingRow(),
          total_count: "1",
        },
      ]),
    } as unknown as DatabaseService
    const { service } = createService(databaseService)

    await expect(
      service.listPublic({
        page: 1,
        pageSize: 20,
        lat: 41.8931,
        lng: 12.4828,
        radiusKm: 25,
        sort: "distance",
      })
    ).resolves.toMatchObject({
      meta: {
        query: null,
        sort: "distance",
        rankingVersion: "postgres-v1",
      },
    })

    expect(databaseService.queryRows).toHaveBeenCalledWith(expect.any(String), [
      20,
      0,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      41.8931,
      12.4828,
      25,
      "distance",
      null,
      null,
    ])
    expect(vi.mocked(databaseService.queryRows).mock.calls[0]?.[0]).toContain(
      "ST_DWithin"
    )
    expect(vi.mocked(databaseService.queryRows).mock.calls[0]?.[0]).toContain(
      "ST_Distance"
    )
  })

  it("returns suggestions when full-text search returns no exact results", async () => {
    const databaseService = {
      queryRows: vi
        .fn()
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          {
            ...createPublicListingRow(),
            id: "suggestion-id",
          },
        ]),
    } as unknown as DatabaseService
    const { service } = createService(databaseService)

    await expect(
      service.listPublic({
        page: 1,
        pageSize: 20,
        q: "siameze roma",
      })
    ).resolves.toMatchObject({
      items: [],
      meta: {
        total: 0,
        query: "siameze roma",
        sort: "relevance",
        rankingVersion: "postgres-v1",
        expansion: null,
      },
      suggestions: {
        title: "Potrebbero interessarti anche",
        reason: "empty_exact",
        items: [
          {
            id: "suggestion-id",
          },
        ],
      },
    })

    expect(databaseService.queryRows).toHaveBeenCalledTimes(2)
    expect(vi.mocked(databaseService.queryRows).mock.calls[1]?.[0]).toContain(
      "not (listing.id = any($23::uuid[]))"
    )
    expect(vi.mocked(databaseService.queryRows).mock.calls[1]?.[0]).toContain(
      "$1::int"
    )
    expect(vi.mocked(databaseService.queryRows).mock.calls[1]?.[0]).toContain(
      "$2::int"
    )
    expect(vi.mocked(databaseService.queryRows).mock.calls[1]?.[1]).toEqual([
      20,
      0,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      "siameze roma",
      null,
      null,
      null,
      "relevance",
      null,
      null,
      [],
      20,
    ])
  })

  it("returns distance-ordered suggestions when nearby search returns no exact results", async () => {
    const databaseService = {
      queryRows: vi
        .fn()
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          {
            ...createPublicListingRow(),
            id: "suggestion-id",
          },
        ]),
    } as unknown as DatabaseService
    const { service } = createService(databaseService)

    await expect(
      service.listPublic({
        page: 1,
        pageSize: 6,
        lat: 41.8931,
        lng: 12.4828,
        radiusKm: 1,
        sort: "distance",
      })
    ).resolves.toMatchObject({
      items: [],
      meta: {
        total: 0,
        sort: "distance",
        expansion: null,
      },
      suggestions: {
        reason: "empty_exact",
        items: [
          {
            id: "suggestion-id",
          },
        ],
      },
    })

    expect(databaseService.queryRows).toHaveBeenCalledTimes(2)
    expect(vi.mocked(databaseService.queryRows).mock.calls[1]?.[0]).toContain(
      "ST_Distance"
    )
  })

  it("returns relaxed suggestions when filters return no exact results", async () => {
    const databaseService = {
      queryRows: vi
        .fn()
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          {
            ...createPublicListingRow(),
            id: "suggestion-id",
          },
        ]),
    } as unknown as DatabaseService
    const { service } = createService(databaseService)

    await expect(
      service.listPublic({
        page: 1,
        pageSize: 20,
        q: "zzzxqvnotfound",
        hasImages: true,
      })
    ).resolves.toMatchObject({
      items: [],
      meta: {
        total: 0,
        query: "zzzxqvnotfound",
        expansion: null,
      },
      suggestions: {
        reason: "empty_exact",
        items: [
          {
            id: "suggestion-id",
          },
        ],
      },
    })

    expect(databaseService.queryRows).toHaveBeenCalledTimes(2)
    expect(
      vi.mocked(databaseService.queryRows).mock.calls[1]?.[0]
    ).not.toContain("listing.breed_id = $3::uuid")
    expect(
      vi.mocked(databaseService.queryRows).mock.calls[1]?.[0]
    ).not.toContain("ST_DWithin")
  })

  it("returns suggestions when exact results do not fill the page", async () => {
    const databaseService = {
      queryRows: vi
        .fn()
        .mockResolvedValueOnce([
          {
            ...createPublicListingRow(),
            total_count: "1",
          },
        ])
        .mockResolvedValueOnce([
          {
            ...createPublicListingRow(),
            id: "suggestion-id",
          },
        ]),
    } as unknown as DatabaseService
    const { service } = createService(databaseService)

    await expect(
      service.listPublic({
        page: 1,
        pageSize: 20,
        q: "roma",
      })
    ).resolves.toMatchObject({
      items: [
        {
          id: "listing-id",
        },
      ],
      suggestions: {
        title: "Potrebbero interessarti anche",
        reason: "not_enough_results",
        items: [
          {
            id: "suggestion-id",
          },
        ],
      },
    })

    expect(vi.mocked(databaseService.queryRows).mock.calls[1]?.[1]).toEqual([
      20,
      0,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      "roma",
      null,
      null,
      null,
      "relevance",
      null,
      null,
      ["listing-id"],
      19,
    ])
  })

  it("does not return suggestions when no public listings exist", async () => {
    const databaseService = {
      queryRows: vi.fn().mockResolvedValue([]),
    } as unknown as DatabaseService
    const { service } = createService(databaseService)

    await expect(
      service.listPublic({
        page: 1,
        pageSize: 20,
        q: "roma",
      })
    ).resolves.toMatchObject({
      items: [],
      suggestions: null,
    })
  })

  it("loads a public listing detail with ready images", async () => {
    const databaseService = {
      queryRows: vi
        .fn()
        .mockResolvedValueOnce([createPublicListingRow()])
        .mockResolvedValueOnce([
          {
            id: "cover-image-id",
            object_key_large: "local/listings/listing-id/large/cover.webp",
            object_key_thumb: "local/listings/listing-id/thumb/cover.webp",
            width: 1200,
            height: 800,
            blur_hash: "blurhash",
            blur_data_url: "data:image/webp;base64,AAAA",
            sort_order: 0,
            is_cover: true,
          },
        ]),
    } as unknown as DatabaseService
    const { service } = createService(databaseService)

    await expect(service.publicDetail("listing-id")).resolves.toMatchObject({
      id: "listing-id",
      images: {
        readyCount: 2,
        items: [
          {
            id: "cover-image-id",
            objectKeyLarge: "local/listings/listing-id/large/cover.webp",
            objectKeyThumb: "local/listings/listing-id/thumb/cover.webp",
            width: 1200,
            height: 800,
            blurHash: "blurhash",
            blurDataUrl: "data:image/webp;base64,AAAA",
            sortOrder: 0,
            isCover: true,
          },
        ],
      },
    })
    expect(vi.mocked(databaseService.queryRows).mock.calls[0]?.[1]).toEqual([
      "listing-id",
    ])
    expect(vi.mocked(databaseService.queryRows).mock.calls[1]?.[1]).toEqual([
      "listing-id",
    ])
  })

  it("throws when a public listing detail is missing", async () => {
    const databaseService = {
      queryRows: vi.fn().mockResolvedValue([]),
    } as unknown as DatabaseService
    const { service } = createService(databaseService)

    await expect(service.publicDetail("missing-id")).rejects.toBeInstanceOf(
      NotFoundException
    )
    expect(databaseService.queryRows).toHaveBeenCalledTimes(1)
  })

  it("lists user drafts with pagination metadata", async () => {
    const databaseService = {
      queryRows: vi.fn().mockResolvedValue([
        {
          ...createDraftRow(),
          moderation_status: "pending_review",
          total_count: "1",
        },
      ]),
    } as unknown as DatabaseService
    const { service } = createService(databaseService)

    const response = await service.listDrafts("user-id", {
      page: 2,
      pageSize: 10,
    })

    expect(databaseService.queryRows).toHaveBeenCalledWith(expect.any(String), [
      "user-id",
      10,
      10,
    ])
    expect(vi.mocked(databaseService.queryRows).mock.calls[0]?.[0]).toContain(
      "moderation_status in ('draft', 'pending_review')"
    )
    expect(response.meta).toEqual({
      page: 2,
      pageSize: 10,
      total: 1,
      totalPages: 1,
    })
    expect(response.items[0]).toMatchObject({
      id: "listing-id",
      title: "Gattino a Roma",
      moderationStatus: "pending_review",
      location: {
        municipality: {
          id: "municipality-id",
          name: "Roma",
          istatCode: "058091",
        },
        center: {
          lat: 41.8931,
          lng: 12.4828,
        },
      },
    })
  })

  it("creates a draft with derived location fields", async () => {
    const databaseService = {
      queryRows: vi
        .fn()
        .mockResolvedValueOnce([
          {
            municipality_id: "municipality-id",
            province_id: "province-id",
            region_id: "region-id",
            center_lat: "41.8931",
            center_lng: "12.4828",
          },
        ])
        .mockResolvedValueOnce([createDraftRow()]),
    } as unknown as DatabaseService
    const { service } = createService(databaseService)

    await expect(
      service.createDraft("user-id", {
        title: "Gattino a Roma",
        description: "Cerca una famiglia",
        sex: "female",
        ageMonths: 18,
        municipalityId: "municipality-id",
        contributionCents: 1500,
        isFree: false,
        contactRequestsEnabled: false,
        contactPhoneMode: "none",
      })
    ).resolves.toMatchObject({
      id: "listing-id",
      sex: "female",
    })
    const [, createParameters = []] = vi.mocked(databaseService.queryRows).mock
      .calls[1]!

    expect(createParameters.slice(0, 15)).toEqual([
      "user-id",
      "Gattino a Roma",
      "gattino-a-roma",
      "Cerca una famiglia",
      null,
      "female",
      18,
      18,
      "municipality-id",
      "province-id",
      "region-id",
      41.8931,
      12.4828,
      1500,
      false,
    ])
    expect(createParameters[19]).toBe(false)
  })

  it("rejects drafts with unknown municipalities", async () => {
    const databaseService = {
      queryRows: vi.fn().mockResolvedValue([]),
    } as unknown as DatabaseService
    const { service } = createService(databaseService)

    await expect(
      service.createDraft("user-id", {
        title: "Gattino a Roma",
        description: "Cerca una famiglia",
        sex: "unknown",
        municipalityId: "missing-municipality-id",
        isFree: true,
        contactRequestsEnabled: true,
        contactPhoneMode: "none",
      })
    ).rejects.toBeInstanceOf(BadRequestException)
    expect(databaseService.queryRows).toHaveBeenCalledTimes(1)
  })

  it("updates only provided draft fields", async () => {
    const databaseService = {
      queryRows: vi.fn().mockResolvedValue([
        {
          ...createDraftRow(),
          title: "Nuovo titolo",
          slug: "nuovo-titolo",
          contribution_cents: 1500,
          is_free: false,
        },
      ]),
    } as unknown as DatabaseService
    const { service } = createService(databaseService)

    await expect(
      service.updateDraft("user-id", "listing-id", {
        title: "Nuovo titolo",
        contributionCents: 1500,
      })
    ).resolves.toMatchObject({
      title: "Nuovo titolo",
      slug: "nuovo-titolo",
      contributionCents: 1500,
      isFree: false,
    })
    const [, updateParameters = []] = vi.mocked(databaseService.queryRows).mock
      .calls[0]!

    expect(updateParameters[0]).toBe("listing-id")
    expect(updateParameters[1]).toBe("user-id")
    expect(updateParameters[2]).toBe(true)
    expect(updateParameters[3]).toBe("Nuovo titolo")
    expect(updateParameters[4]).toBe("nuovo-titolo")
    expect(updateParameters[21]).toBe(true)
    expect(updateParameters[22]).toBe(1500)
    expect(updateParameters[23]).toBe(true)
    expect(updateParameters[24]).toBe(false)
    expect(updateParameters[33]).toBe(false)
  })

  it("updates draft contact preferences", async () => {
    const databaseService = {
      queryRows: vi.fn().mockResolvedValue([
        {
          ...createDraftRow(),
          contact_requests_enabled: false,
        },
      ]),
    } as unknown as DatabaseService
    const { service } = createService(databaseService)

    await expect(
      service.updateDraft("user-id", "listing-id", {
        contactRequestsEnabled: false,
      })
    ).resolves.toMatchObject({
      contactRequestsEnabled: false,
    })
    const [, updateParameters = []] = vi.mocked(databaseService.queryRows).mock
      .calls[0]!

    expect(updateParameters[33]).toBe(true)
    expect(updateParameters[34]).toBe(false)
  })

  it("throws when a draft is missing", async () => {
    const databaseService = {
      queryRows: vi.fn().mockResolvedValue([]),
    } as unknown as DatabaseService
    const { service } = createService(databaseService)

    await expect(service.draft("user-id", "missing-id")).rejects.toBeInstanceOf(
      NotFoundException
    )
  })

  it("soft deletes a draft", async () => {
    const databaseService = {
      queryRows: vi.fn().mockResolvedValue([{ id: "listing-id" }]),
    } as unknown as DatabaseService
    const { service } = createService(databaseService)

    await expect(service.deleteDraft("user-id", "listing-id")).resolves.toEqual(
      {
        deleted: true,
      }
    )
    expect(databaseService.queryRows).toHaveBeenCalledWith(expect.any(String), [
      "listing-id",
      "user-id",
    ])
  })

  it("requests a verification code for a listing-only phone", async () => {
    const databaseService = {
      queryRows: vi.fn().mockResolvedValue([
        {
          phone_e164: "+39123456789",
          contact_phone_verified_at: null,
          code_id: "code-id",
          expires_at: "2026-04-01T10:10:00.000Z",
        },
      ]),
    } as unknown as DatabaseService
    const { service } = createService(databaseService)

    const response = await service.requestDraftPhoneVerification(
      "user-id",
      "listing-id"
    )
    const [, parameters = []] = vi.mocked(databaseService.queryRows).mock
      .calls[0]!

    expect(response).toMatchObject({
      alreadyVerified: false,
      expiresAt: "2026-04-01T10:10:00.000Z",
      sent: true,
    })
    expect(response.devCode).toMatch(/^\d{6}$/)
    expect(parameters[0]).toBe("user-id")
    expect(parameters[1]).toBe("listing-id")
    await expect(
      verifyPassword(String(response.devCode), String(parameters[2]))
    ).resolves.toBe(true)
  })

  it("confirms a verification code for a listing-only phone", async () => {
    const codeHash = await hashPassword("123456")
    const databaseService = {
      queryRows: vi
        .fn()
        .mockResolvedValueOnce([
          {
            id: "code-id",
            phone_e164: "+39123456789",
            code_hash: codeHash,
          },
        ])
        .mockResolvedValueOnce([
          {
            contact_phone_verified_at: "2026-04-01T10:05:00.000Z",
          },
        ]),
    } as unknown as DatabaseService
    const { service } = createService(databaseService)

    await expect(
      service.confirmDraftPhoneVerification("user-id", "listing-id", {
        code: "123456",
      })
    ).resolves.toEqual({
      phoneVerifiedAt: "2026-04-01T10:05:00.000Z",
      verified: true,
    })
    expect(vi.mocked(databaseService.queryRows).mock.calls[1]?.[1]).toEqual([
      "user-id",
      "listing-id",
      "code-id",
    ])
  })

  it("submits a complete draft for review", async () => {
    const databaseService = {
      queryRows: vi
        .fn()
        .mockResolvedValueOnce([createDraftRow()])
        .mockResolvedValueOnce([createImageReadinessRow()])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          {
            ...createDraftRow(),
            moderation_status: "pending_review",
          },
        ]),
    } as unknown as DatabaseService
    const notificationsService = {
      createListingReviewSubmissionNotification: vi.fn().mockResolvedValue({
        id: "notification-id",
      }),
    } as unknown as NotificationsService
    const { service } = createService(
      databaseService,
      undefined,
      notificationsService
    )

    await expect(
      service.submitDraftForReview("user-id", "listing-id")
    ).resolves.toMatchObject({
      submitted: true,
      listing: {
        id: "listing-id",
        moderationStatus: "pending_review",
        lifecycleStatus: "draft",
      },
    })

    expect(vi.mocked(databaseService.queryRows).mock.calls[0]?.[1]).toEqual([
      "user-id",
      "listing-id",
    ])
    expect(vi.mocked(databaseService.queryRows).mock.calls[1]?.[1]).toEqual([
      "listing-id",
    ])
    expect(vi.mocked(databaseService.queryRows).mock.calls[2]?.[1]).toEqual([
      "user-id",
      "listing-id",
      "gattino-a-roma",
      "municipality-id",
    ])
    expect(vi.mocked(databaseService.queryRows).mock.calls[3]?.[1]).toEqual([
      "listing-id",
      "user-id",
    ])
    expect(
      notificationsService.createListingReviewSubmissionNotification
    ).toHaveBeenCalledWith("user-id", {
      listingId: "listing-id",
      listingSlug: "gattino-a-roma",
      listingTitle: "Gattino a Roma",
      moderationStatus: "pending_review",
    })
  })

  it("rejects incomplete drafts before review submission", async () => {
    const databaseService = {
      queryRows: vi.fn().mockResolvedValue([
        {
          ...createDraftRow(),
          municipality_id: null,
          municipality_name: null,
          municipality_istat_code: null,
          province_id: null,
          province_name: null,
          province_istat_code: null,
          region_id: null,
          region_name: null,
          region_istat_code: null,
        },
      ]),
    } as unknown as DatabaseService
    const { service } = createService(databaseService)

    await expect(
      service.submitDraftForReview("user-id", "listing-id")
    ).rejects.toBeInstanceOf(BadRequestException)
    expect(databaseService.queryRows).toHaveBeenCalledTimes(1)
  })

  it("rejects submissions without a ready image", async () => {
    const databaseService = {
      queryRows: vi
        .fn()
        .mockResolvedValueOnce([createDraftRow()])
        .mockResolvedValueOnce([
          createImageReadinessRow({
            ready_count: 0,
          }),
        ]),
    } as unknown as DatabaseService
    const { service } = createService(databaseService)

    await expect(
      service.submitDraftForReview("user-id", "listing-id")
    ).rejects.toBeInstanceOf(BadRequestException)
    expect(databaseService.queryRows).toHaveBeenCalledTimes(2)
  })

  it("rejects submissions while images are still processing", async () => {
    const databaseService = {
      queryRows: vi
        .fn()
        .mockResolvedValueOnce([createDraftRow()])
        .mockResolvedValueOnce([
          createImageReadinessRow({
            pending_count: 1,
          }),
        ]),
    } as unknown as DatabaseService
    const { service } = createService(databaseService)

    await expect(
      service.submitDraftForReview("user-id", "listing-id")
    ).rejects.toBeInstanceOf(BadRequestException)
    expect(databaseService.queryRows).toHaveBeenCalledTimes(2)
  })

  it("rejects submissions with rejected images", async () => {
    const databaseService = {
      queryRows: vi
        .fn()
        .mockResolvedValueOnce([createDraftRow()])
        .mockResolvedValueOnce([
          createImageReadinessRow({
            rejected_count: 1,
          }),
        ]),
    } as unknown as DatabaseService
    const { service } = createService(databaseService)

    await expect(
      service.submitDraftForReview("user-id", "listing-id")
    ).rejects.toBeInstanceOf(BadRequestException)
    expect(databaseService.queryRows).toHaveBeenCalledTimes(2)
  })

  it("rejects duplicate draft submissions", async () => {
    const databaseService = {
      queryRows: vi
        .fn()
        .mockResolvedValueOnce([createDraftRow()])
        .mockResolvedValueOnce([createImageReadinessRow()])
        .mockResolvedValueOnce([{ id: "duplicate-listing-id" }]),
    } as unknown as DatabaseService
    const { service } = createService(databaseService)

    await expect(
      service.submitDraftForReview("user-id", "listing-id")
    ).rejects.toBeInstanceOf(BadRequestException)
    expect(databaseService.queryRows).toHaveBeenCalledTimes(3)
  })

  it("creates an image upload URL for a draft", async () => {
    const databaseService = {
      queryRows: vi
        .fn()
        .mockResolvedValueOnce([createDraftRow()])
        .mockResolvedValueOnce([{ image_count: 0 }])
        .mockResolvedValueOnce([createImageRow()]),
    } as unknown as DatabaseService
    const { objectStorageService, service } = createService(databaseService)

    await expect(
      service.createDraftImageUpload("user-id", "listing-id", {
        mimeType: "image/jpeg",
        sizeBytes: 123_456,
        isCover: true,
      })
    ).resolves.toEqual({
      image: {
        id: "image-id",
        listingId: "listing-id",
        objectKeyOriginal: "local/listings/listing-id/original/image.jpg",
        objectKeyLarge: null,
        objectKeyThumb: null,
        mimeType: "image/jpeg",
        width: null,
        height: null,
        sizeBytes: 123_456,
        checksum: null,
        blurHash: null,
        blurDataUrl: null,
        sortOrder: 0,
        isCover: true,
        status: "uploaded",
        rejectionReason: null,
        createdAt: "2026-04-01T10:00:00.000Z",
        updatedAt: "2026-04-01T10:00:00.000Z",
      },
      upload: {
        method: "PUT",
        url: "http://localhost:9000/adottaungatto-local/key",
        headers: {
          "Content-Type": "image/jpeg",
        },
        expiresInSeconds: 900,
        maxSizeBytes: 10 * 1024 * 1024,
      },
    })
    expect(objectStorageService.createListingImageUpload).toHaveBeenCalledWith(
      "listing-id",
      "image/jpeg"
    )
    expect(vi.mocked(databaseService.queryRows).mock.calls[2]?.[1]).toEqual([
      "listing-id",
      "local/listings/listing-id/original/image.jpg",
      "image/jpeg",
      123_456,
      true,
    ])
  })

  it("rejects image uploads when a draft reached the image limit", async () => {
    const databaseService = {
      queryRows: vi
        .fn()
        .mockResolvedValueOnce([createDraftRow()])
        .mockResolvedValueOnce([{ image_count: 10 }]),
    } as unknown as DatabaseService
    const { objectStorageService, service } = createService(databaseService)

    await expect(
      service.createDraftImageUpload("user-id", "listing-id", {
        mimeType: "image/png",
        sizeBytes: 123_456,
        isCover: false,
      })
    ).rejects.toBeInstanceOf(BadRequestException)
    expect(objectStorageService.createListingImageUpload).not.toHaveBeenCalled()
    expect(databaseService.queryRows).toHaveBeenCalledTimes(2)
  })

  it("confirms an uploaded draft image", async () => {
    const databaseService = {
      queryRows: vi
        .fn()
        .mockResolvedValueOnce([createImageRow()])
        .mockResolvedValueOnce([
          {
            ...createImageRow(),
            status: "processing",
            checksum: "object-etag",
          },
        ]),
    } as unknown as DatabaseService
    const { objectStorageService, service } = createService(databaseService)

    await expect(
      service.confirmDraftImageUpload("user-id", "listing-id", "image-id")
    ).resolves.toMatchObject({
      confirmed: true,
      image: {
        id: "image-id",
        status: "processing",
        checksum: "object-etag",
      },
    })
    expect(objectStorageService.statObject).toHaveBeenCalledWith(
      "local/listings/listing-id/original/image.jpg"
    )
    expect(vi.mocked(databaseService.queryRows).mock.calls[1]?.[1]).toEqual([
      "user-id",
      "listing-id",
      "image-id",
      123_456,
      "object-etag",
    ])
  })

  it("rejects confirmation for images that are not pending upload", async () => {
    const databaseService = {
      queryRows: vi.fn().mockResolvedValue([
        {
          ...createImageRow(),
          status: "processing",
        },
      ]),
    } as unknown as DatabaseService
    const { objectStorageService, service } = createService(databaseService)

    await expect(
      service.confirmDraftImageUpload("user-id", "listing-id", "image-id")
    ).rejects.toBeInstanceOf(BadRequestException)
    expect(objectStorageService.statObject).not.toHaveBeenCalled()
  })

  it("lists draft images with readiness metadata", async () => {
    const databaseService = {
      queryRows: vi
        .fn()
        .mockResolvedValueOnce([createDraftRow()])
        .mockResolvedValueOnce([
          createImageRow({
            object_key_large: "local/listings/listing-id/large/image.webp",
            object_key_thumb: "local/listings/listing-id/thumb/image.webp",
            status: "ready",
          }),
          createImageRow({
            id: "image-id-2",
            is_cover: false,
            status: "processing",
          }),
          createImageRow({
            id: "image-id-3",
            is_cover: false,
            status: "rejected",
          }),
        ]),
    } as unknown as DatabaseService
    const { service } = createService(databaseService)

    await expect(
      service.listDraftImages("user-id", "listing-id")
    ).resolves.toMatchObject({
      items: [
        {
          id: "image-id",
          status: "ready",
          isCover: true,
        },
        {
          id: "image-id-2",
          status: "processing",
        },
        {
          id: "image-id-3",
          status: "rejected",
        },
      ],
      meta: {
        total: 3,
        readyCount: 1,
        pendingCount: 1,
        rejectedCount: 1,
        coverImageId: "image-id",
        maxItems: 10,
      },
    })
    expect(vi.mocked(databaseService.queryRows).mock.calls[1]?.[1]).toEqual([
      "user-id",
      "listing-id",
    ])
  })

  it("soft deletes a draft image", async () => {
    const databaseService = {
      queryRows: vi
        .fn()
        .mockResolvedValueOnce([
          { id: "image-id", cover_image_id: "image-id-2" },
        ])
        .mockResolvedValueOnce([createDraftRow()])
        .mockResolvedValueOnce([
          createImageRow({
            id: "image-id-2",
            is_cover: true,
          }),
        ]),
    } as unknown as DatabaseService
    const { service } = createService(databaseService)

    await expect(
      service.deleteDraftImage("user-id", "listing-id", "image-id")
    ).resolves.toMatchObject({
      deleted: true,
      imageId: "image-id",
      images: {
        items: [
          {
            id: "image-id-2",
            isCover: true,
          },
        ],
      },
    })
    expect(vi.mocked(databaseService.queryRows).mock.calls[0]?.[1]).toEqual([
      "user-id",
      "listing-id",
      "image-id",
    ])
  })

  it("sets a draft image as cover", async () => {
    const databaseService = {
      queryRows: vi
        .fn()
        .mockResolvedValueOnce([
          createImageRow({
            id: "image-id-2",
            is_cover: true,
          }),
        ])
        .mockResolvedValueOnce([createDraftRow()])
        .mockResolvedValueOnce([
          createImageRow({
            id: "image-id-2",
            is_cover: true,
          }),
        ]),
    } as unknown as DatabaseService
    const { service } = createService(databaseService)

    await expect(
      service.setDraftImageCover("user-id", "listing-id", "image-id-2")
    ).resolves.toMatchObject({
      image: {
        id: "image-id-2",
        isCover: true,
      },
      images: {
        meta: {
          coverImageId: "image-id-2",
        },
      },
    })
  })

  it("reorders draft images", async () => {
    const firstImage = createImageRow({
      id: "image-id-1",
      is_cover: true,
      sort_order: 0,
    })
    const secondImage = createImageRow({
      id: "image-id-2",
      is_cover: false,
      sort_order: 1,
    })
    const databaseService = {
      queryRows: vi
        .fn()
        .mockResolvedValueOnce([createDraftRow()])
        .mockResolvedValueOnce([firstImage, secondImage])
        .mockResolvedValueOnce([{ id: "image-id-2" }, { id: "image-id-1" }])
        .mockResolvedValueOnce([createDraftRow()])
        .mockResolvedValueOnce([
          { ...secondImage, sort_order: 0 },
          { ...firstImage, sort_order: 1 },
        ]),
    } as unknown as DatabaseService
    const { service } = createService(databaseService)

    await expect(
      service.reorderDraftImages("user-id", "listing-id", {
        imageIds: ["image-id-2", "image-id-1"],
      })
    ).resolves.toMatchObject({
      images: {
        items: [
          {
            id: "image-id-2",
            sortOrder: 0,
          },
          {
            id: "image-id-1",
            sortOrder: 1,
          },
        ],
      },
    })
    expect(
      JSON.parse(
        String(vi.mocked(databaseService.queryRows).mock.calls[2]?.[1]?.[2])
      )
    ).toEqual([
      {
        id: "image-id-2",
        sort_order: 0,
      },
      {
        id: "image-id-1",
        sort_order: 1,
      },
    ])
  })

  it("rejects reorder payloads that omit active draft images", async () => {
    const databaseService = {
      queryRows: vi
        .fn()
        .mockResolvedValueOnce([createDraftRow()])
        .mockResolvedValueOnce([
          createImageRow({ id: "image-id-1" }),
          createImageRow({ id: "image-id-2", is_cover: false }),
        ]),
    } as unknown as DatabaseService
    const { service } = createService(databaseService)

    await expect(
      service.reorderDraftImages("user-id", "listing-id", {
        imageIds: ["image-id-1"],
      })
    ).rejects.toBeInstanceOf(BadRequestException)
    expect(databaseService.queryRows).toHaveBeenCalledTimes(2)
  })

  it("rejects confirmation when the storage object is missing", async () => {
    const databaseService = {
      queryRows: vi.fn().mockResolvedValue([createImageRow()]),
    } as unknown as DatabaseService
    const objectStorageService = createObjectStorageService()

    vi.mocked(objectStorageService.statObject).mockRejectedValue(
      new Error("not found")
    )
    const { service } = createService(databaseService, objectStorageService)

    await expect(
      service.confirmDraftImageUpload("user-id", "listing-id", "image-id")
    ).rejects.toBeInstanceOf(BadRequestException)
  })
})

function createService(
  databaseService: DatabaseService,
  objectStorageService = createObjectStorageService(),
  notificationsService?: NotificationsService
) {
  return {
    objectStorageService,
    service: new ListingsService(
      databaseService,
      objectStorageService,
      notificationsService
    ),
  }
}

function createObjectStorageService() {
  return {
    createListingImageUpload: vi.fn().mockResolvedValue({
      expiresInSeconds: 900,
      objectKey: "local/listings/listing-id/original/image.jpg",
      url: "http://localhost:9000/adottaungatto-local/key",
    }),
    statObject: vi.fn().mockResolvedValue({
      checksum: "object-etag",
      sizeBytes: 123_456,
    }),
  } as unknown as ObjectStorageService
}

function createDraftRow() {
  return {
    id: "listing-id",
    title: "Gattino a Roma",
    slug: "gattino-a-roma",
    description: "Cerca una famiglia",
    breed_id: "breed-id",
    breed_name: "Europeo",
    breed_slug: "europeo",
    sex: "female",
    age_months_min: 4,
    age_months_max: 4,
    municipality_id: "municipality-id",
    municipality_name: "Roma",
    municipality_istat_code: "058091",
    province_id: "province-id",
    province_name: "Roma",
    province_istat_code: "058",
    region_id: "region-id",
    region_name: "Lazio",
    region_istat_code: "12",
    location_lat: "41.8931",
    location_lng: "12.4828",
    contribution_cents: null,
    is_free: true,
    is_vaccinated: null,
    is_sterilized: null,
    is_dewormed: null,
    has_microchip: null,
    contact_requests_enabled: true,
    contact_phone_mode: "none",
    contact_phone_e164: null,
    contact_phone_verified_at: null,
    moderation_status: "draft",
    lifecycle_status: "draft",
    created_at: "2026-04-01T09:00:00.000Z",
    updated_at: "2026-04-01T10:00:00.000Z",
  }
}

function createPublicListingRow() {
  return {
    id: "listing-id",
    title: "Gattino a Roma",
    slug: "gattino-a-roma",
    description: "Cerca una famiglia",
    breed_id: "breed-id",
    breed_name: "Europeo",
    breed_slug: "europeo",
    sex: "female",
    age_months_min: 4,
    age_months_max: 4,
    municipality_id: "municipality-id",
    municipality_name: "Roma",
    municipality_istat_code: "058091",
    province_id: "province-id",
    province_name: "Roma",
    province_istat_code: "058",
    region_id: "region-id",
    region_name: "Lazio",
    region_istat_code: "12",
    location_lat: "41.8931",
    location_lng: "12.4828",
    contribution_cents: null,
    is_free: true,
    is_vaccinated: true,
    is_sterilized: null,
    is_dewormed: true,
    has_microchip: false,
    contact_requests_enabled: true,
    contact_phone_mode: "none",
    contact_phone_e164: null,
    contact_phone_verified_at: null,
    public_phone_e164: null,
    published_at: "2026-04-20T10:00:00.000Z",
    expires_at: null,
    created_at: "2026-04-01T09:00:00.000Z",
    updated_at: "2026-04-20T10:00:00.000Z",
    owner_user_id: "owner-id",
    owner_display_name: "Owner",
    owner_profile_type: "private",
    favorite_count: "3",
    like_count: "4",
    ready_image_count: "2",
    cover_image_id: "cover-image-id",
    cover_object_key_large: "local/listings/listing-id/large/cover.webp",
    cover_object_key_thumb: "local/listings/listing-id/thumb/cover.webp",
    cover_width: 1200,
    cover_height: 800,
    cover_blur_hash: "blurhash",
    cover_blur_data_url: "data:image/webp;base64,AAAA",
    cover_sort_order: 0,
    cover_is_cover: true,
    preview_images: [
      {
        id: "cover-image-id",
        object_key_large: "local/listings/listing-id/large/cover.webp",
        object_key_thumb: "local/listings/listing-id/thumb/cover.webp",
        width: 1200,
        height: 800,
        blur_hash: "blurhash",
        blur_data_url: "data:image/webp;base64,AAAA",
        sort_order: 0,
        is_cover: true,
      },
      {
        id: "second-image-id",
        object_key_large: "local/listings/listing-id/large/second.webp",
        object_key_thumb: "local/listings/listing-id/thumb/second.webp",
        width: 900,
        height: 1200,
        blur_hash: null,
        blur_data_url: null,
        sort_order: 1,
        is_cover: false,
      },
    ],
    is_sponsored: false,
    sponsorship_label: null,
    sponsorship_placement: null,
  }
}

function createImageRow(
  overrides: Partial<{
    id: string
    listing_id: string
    object_key_original: string
    object_key_large: string | null
    object_key_thumb: string | null
    mime_type: string
    width: number | null
    height: number | null
    size_bytes: number
    checksum: string | null
    blur_hash: string | null
    blur_data_url: string | null
    sort_order: number
    is_cover: boolean
    status: string
    rejection_reason: string | null
    created_at: string
    updated_at: string
  }> = {}
) {
  return {
    id: "image-id",
    listing_id: "listing-id",
    object_key_original: "local/listings/listing-id/original/image.jpg",
    object_key_large: null,
    object_key_thumb: null,
    mime_type: "image/jpeg",
    width: null,
    height: null,
    size_bytes: 123_456,
    checksum: null,
    blur_hash: null,
    blur_data_url: null,
    sort_order: 0,
    is_cover: true,
    status: "uploaded",
    rejection_reason: null,
    created_at: "2026-04-01T10:00:00.000Z",
    updated_at: "2026-04-01T10:00:00.000Z",
    ...overrides,
  }
}

function createImageReadinessRow(
  overrides: Partial<{
    ready_count: number
    pending_count: number
    rejected_count: number
  }> = {}
) {
  return {
    ready_count: 1,
    pending_count: 0,
    rejected_count: 0,
    ...overrides,
  }
}
