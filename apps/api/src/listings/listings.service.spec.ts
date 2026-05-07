import { BadRequestException, NotFoundException } from "@nestjs/common"
import { describe, expect, it, vi } from "vitest"

import type { DatabaseService } from "../database/database.service.js"
import type { ObjectStorageService } from "../storage/object-storage.service.js"
import { createListingSlug, ListingsService } from "./listings.service.js"

describe("ListingsService", () => {
  it("normalizes listing titles into slugs", () => {
    expect(createListingSlug(" Gattino a Roma! ")).toBe("gattino-a-roma")
    expect(createListingSlug("!!!")).toBe("annuncio")
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
          publishedAt: "2026-04-20T10:00:00.000Z",
          createdAt: "2026-04-01T09:00:00.000Z",
          owner: {
            id: "owner-id",
            displayName: "Owner",
            profileType: "private",
          },
          stats: {
            likeCount: 4,
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
              sortOrder: 0,
              isCover: true,
            },
          },
        }),
      ],
      meta: {
        page: 2,
        pageSize: 10,
        total: 1,
        totalPages: 1,
      },
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
    ])
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
    expect(response.meta).toEqual({
      page: 2,
      pageSize: 10,
      total: 1,
      totalPages: 1,
    })
    expect(response.items[0]).toMatchObject({
      id: "listing-id",
      title: "Gattino a Roma",
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
        municipalityId: "municipality-id",
        contributionCents: 1500,
        isFree: false,
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
      null,
      null,
      "municipality-id",
      "province-id",
      "region-id",
      41.8931,
      12.4828,
      1500,
      false,
    ])
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
    const { service } = createService(databaseService)

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
  objectStorageService = createObjectStorageService()
) {
  return {
    objectStorageService,
    service: new ListingsService(databaseService, objectStorageService),
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
    age_months_min: 2,
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
    age_months_min: 2,
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
    published_at: "2026-04-20T10:00:00.000Z",
    expires_at: null,
    created_at: "2026-04-01T09:00:00.000Z",
    updated_at: "2026-04-20T10:00:00.000Z",
    owner_user_id: "owner-id",
    owner_display_name: "Owner",
    owner_profile_type: "private",
    like_count: "4",
    ready_image_count: "2",
    cover_image_id: "cover-image-id",
    cover_object_key_large: "local/listings/listing-id/large/cover.webp",
    cover_object_key_thumb: "local/listings/listing-id/thumb/cover.webp",
    cover_width: 1200,
    cover_height: 800,
    cover_blur_hash: "blurhash",
    cover_sort_order: 0,
    cover_is_cover: true,
  }
}

function createImageRow() {
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
    sort_order: 0,
    is_cover: true,
    status: "uploaded",
    rejection_reason: null,
    created_at: "2026-04-01T10:00:00.000Z",
    updated_at: "2026-04-01T10:00:00.000Z",
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
