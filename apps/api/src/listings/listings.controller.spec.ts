import { BadRequestException } from "@nestjs/common"
import { describe, expect, it, vi } from "vitest"

import type { RateLimitService } from "../rate-limit/rate-limit.service.js"
import { ListingsController } from "./listings.controller.js"
import type { ListingsService } from "./listings.service.js"

describe("ListingsController", () => {
  it("validates public listing queries and delegates", async () => {
    const listingsService = {
      listPublic: vi.fn().mockResolvedValue({ items: [], meta: {} }),
    } as unknown as ListingsService
    const controller = new ListingsController(
      listingsService,
      createRateLimitService()
    )

    await controller.listPublic({
      page: "2",
      pageSize: "10",
      q: "  Gattino Roma  ",
      ageMonthsMin: "2",
      ageMonthsMax: "12",
      hasImages: "true",
      hasMicrochip: "false",
      isFree: "true",
      lat: "41.8931",
      lng: "12.4828",
      radiusKm: "25",
      sex: "female",
      sort: "distance",
      regionId: "00000000-0000-0000-0000-000000000001",
    })

    expect(listingsService.listPublic).toHaveBeenCalledWith({
      page: 2,
      pageSize: 10,
      q: "Gattino Roma",
      ageMonthsMin: 2,
      ageMonthsMax: 12,
      hasImages: true,
      hasMicrochip: false,
      isFree: true,
      lat: 41.8931,
      lng: 12.4828,
      radiusKm: 25,
      sex: "female",
      sort: "distance",
      regionId: "00000000-0000-0000-0000-000000000001",
    })
  })

  it("rejects invalid public listing queries", async () => {
    const listingsService = {
      listPublic: vi.fn(),
    } as unknown as ListingsService
    const controller = new ListingsController(
      listingsService,
      createRateLimitService()
    )

    await expect(
      controller.listPublic({
        sex: "invalid",
      })
    ).rejects.toBeInstanceOf(BadRequestException)
    expect(listingsService.listPublic).not.toHaveBeenCalled()
  })

  it("rejects invalid public listing age ranges", async () => {
    const listingsService = {
      listPublic: vi.fn(),
    } as unknown as ListingsService
    const controller = new ListingsController(
      listingsService,
      createRateLimitService()
    )

    await expect(
      controller.listPublic({
        ageMonthsMin: "24",
        ageMonthsMax: "12",
      })
    ).rejects.toBeInstanceOf(BadRequestException)
    expect(listingsService.listPublic).not.toHaveBeenCalled()
  })

  it("validates public listing contribution ranges", async () => {
    const listingsService = {
      listPublic: vi.fn().mockResolvedValue({ items: [], meta: {} }),
    } as unknown as ListingsService
    const controller = new ListingsController(
      listingsService,
      createRateLimitService()
    )

    await controller.listPublic({
      contributionCentsMin: "5000",
      contributionCentsMax: "15000",
    })

    expect(listingsService.listPublic).toHaveBeenCalledWith({
      page: 1,
      pageSize: 20,
      contributionCentsMin: 5000,
      contributionCentsMax: 15000,
    })
  })

  it("rejects public listing free filters mixed with contribution ranges", async () => {
    const listingsService = {
      listPublic: vi.fn(),
    } as unknown as ListingsService
    const controller = new ListingsController(
      listingsService,
      createRateLimitService()
    )

    await expect(
      controller.listPublic({
        isFree: "true",
        contributionCentsMax: "5000",
      })
    ).rejects.toBeInstanceOf(BadRequestException)
    expect(listingsService.listPublic).not.toHaveBeenCalled()
  })

  it("rejects invalid public listing search queries", async () => {
    const listingsService = {
      listPublic: vi.fn(),
    } as unknown as ListingsService
    const controller = new ListingsController(
      listingsService,
      createRateLimitService()
    )

    await expect(
      controller.listPublic({
        q: "!!!",
      })
    ).rejects.toBeInstanceOf(BadRequestException)
    expect(listingsService.listPublic).not.toHaveBeenCalled()
  })

  it("rejects distance sorting without an origin", async () => {
    const listingsService = {
      listPublic: vi.fn(),
    } as unknown as ListingsService
    const controller = new ListingsController(
      listingsService,
      createRateLimitService()
    )

    await expect(
      controller.listPublic({
        sort: "distance",
      })
    ).rejects.toBeInstanceOf(BadRequestException)
    expect(listingsService.listPublic).not.toHaveBeenCalled()
  })

  it("delegates public breed lists", async () => {
    const listingsService = {
      listPublicCatBreeds: vi.fn().mockResolvedValue([]),
    } as unknown as ListingsService
    const controller = new ListingsController(
      listingsService,
      createRateLimitService()
    )

    await expect(controller.listPublicBreeds()).resolves.toEqual([])
    expect(listingsService.listPublicCatBreeds).toHaveBeenCalledWith()
  })

  it("validates public listing ids and delegates", async () => {
    const listingsService = {
      publicDetail: vi.fn().mockResolvedValue({ id: "listing-id" }),
    } as unknown as ListingsService
    const controller = new ListingsController(
      listingsService,
      createRateLimitService()
    )

    await controller.publicDetail({
      id: "00000000-0000-0000-0000-000000000001",
    })

    expect(listingsService.publicDetail).toHaveBeenCalledWith(
      "00000000-0000-0000-0000-000000000001"
    )
  })

  it("validates draft list queries and delegates", async () => {
    const listingsService = {
      listDrafts: vi.fn().mockResolvedValue({ items: [], meta: {} }),
    } as unknown as ListingsService
    const controller = new ListingsController(
      listingsService,
      createRateLimitService()
    )

    await controller.listDrafts(createAuth(), {
      page: "2",
      pageSize: "10",
    })

    expect(listingsService.listDrafts).toHaveBeenCalledWith("user-id", {
      page: 2,
      pageSize: 10,
    })
  })

  it("validates draft create payloads and delegates", async () => {
    const listingsService = {
      createDraft: vi.fn().mockResolvedValue({ id: "listing-id" }),
    } as unknown as ListingsService
    const controller = new ListingsController(
      listingsService,
      createRateLimitService()
    )

    await controller.createDraft(createAuth(), {
      title: "  Gattino a Roma  ",
      description: "  Cerca una famiglia  ",
      ageMonths: "18",
    })

    expect(listingsService.createDraft).toHaveBeenCalledWith("user-id", {
      title: "Gattino a Roma",
      description: "Cerca una famiglia",
      ageMonths: 18,
      sex: "unknown",
      isFree: true,
      contactRequestsEnabled: true,
    })
  })

  it("validates draft contact preference updates and delegates", async () => {
    const listingsService = {
      updateDraft: vi.fn().mockResolvedValue({ id: "listing-id" }),
    } as unknown as ListingsService
    const controller = new ListingsController(
      listingsService,
      createRateLimitService()
    )

    await controller.updateDraft(
      createAuth(),
      { id: "00000000-0000-0000-0000-000000000001" },
      { contactRequestsEnabled: false }
    )

    expect(listingsService.updateDraft).toHaveBeenCalledWith(
      "user-id",
      "00000000-0000-0000-0000-000000000001",
      {
        contactRequestsEnabled: false,
      }
    )
  })

  it("rejects invalid draft update payloads", async () => {
    const listingsService = {
      updateDraft: vi.fn(),
    } as unknown as ListingsService
    const controller = new ListingsController(
      listingsService,
      createRateLimitService()
    )

    await expect(
      controller.updateDraft(
        createAuth(),
        { id: "00000000-0000-0000-0000-000000000001" },
        {}
      )
    ).rejects.toBeInstanceOf(BadRequestException)
    expect(listingsService.updateDraft).not.toHaveBeenCalled()
  })

  it("validates submit-review draft ids and delegates", async () => {
    const listingsService = {
      submitDraftForReview: vi.fn().mockResolvedValue({ submitted: true }),
    } as unknown as ListingsService
    const controller = new ListingsController(
      listingsService,
      createRateLimitService()
    )

    await controller.submitDraftForReview(createAuth(), {
      id: "00000000-0000-0000-0000-000000000001",
    })

    expect(listingsService.submitDraftForReview).toHaveBeenCalledWith(
      "user-id",
      "00000000-0000-0000-0000-000000000001"
    )
  })

  it("validates draft image upload payloads and delegates", async () => {
    const listingsService = {
      createDraftImageUpload: vi.fn().mockResolvedValue({ image: {} }),
    } as unknown as ListingsService
    const rateLimitService = createRateLimitService()
    const controller = new ListingsController(listingsService, rateLimitService)

    await controller.createDraftImageUpload(
      createAuth(),
      { id: "00000000-0000-0000-0000-000000000001" },
      {
        mimeType: "image/webp",
        sizeBytes: "123456",
        isCover: true,
      },
      createRequest()
    )

    expect(rateLimitService.enforce).toHaveBeenCalledWith([
      expect.objectContaining({
        identifier: "ip:203.0.113.10",
        namespace: "listings:images:upload-url:ip",
      }),
      expect.objectContaining({
        identifier: "user:user-id",
        namespace: "listings:images:upload-url:user",
      }),
      expect.objectContaining({
        identifier: "draft:00000000-0000-0000-0000-000000000001",
        namespace: "listings:images:upload-url:draft",
      }),
    ])
    expect(listingsService.createDraftImageUpload).toHaveBeenCalledWith(
      "user-id",
      "00000000-0000-0000-0000-000000000001",
      {
        mimeType: "image/webp",
        sizeBytes: 123456,
        isCover: true,
      }
    )
  })

  it("validates draft image confirmation ids and delegates", async () => {
    const listingsService = {
      confirmDraftImageUpload: vi.fn().mockResolvedValue({ confirmed: true }),
    } as unknown as ListingsService
    const rateLimitService = createRateLimitService()
    const controller = new ListingsController(listingsService, rateLimitService)

    await controller.confirmDraftImageUpload(
      createAuth(),
      {
        id: "00000000-0000-0000-0000-000000000001",
        imageId: "00000000-0000-0000-0000-000000000002",
      },
      createRequest()
    )

    expect(rateLimitService.enforce).toHaveBeenCalledWith([
      expect.objectContaining({
        identifier: "ip:203.0.113.10",
        namespace: "listings:images:confirm:ip",
      }),
      expect.objectContaining({
        identifier: "user:user-id",
        namespace: "listings:images:confirm:user",
      }),
      expect.objectContaining({
        identifier:
          "image:00000000-0000-0000-0000-000000000001:00000000-0000-0000-0000-000000000002",
        namespace: "listings:images:confirm:image",
      }),
    ])
    expect(listingsService.confirmDraftImageUpload).toHaveBeenCalledWith(
      "user-id",
      "00000000-0000-0000-0000-000000000001",
      "00000000-0000-0000-0000-000000000002"
    )
  })

  it("validates draft image list ids and delegates", async () => {
    const listingsService = {
      listDraftImages: vi.fn().mockResolvedValue({ items: [] }),
    } as unknown as ListingsService
    const controller = new ListingsController(
      listingsService,
      createRateLimitService()
    )

    await controller.listDraftImages(createAuth(), {
      id: "00000000-0000-0000-0000-000000000001",
    })

    expect(listingsService.listDraftImages).toHaveBeenCalledWith(
      "user-id",
      "00000000-0000-0000-0000-000000000001"
    )
  })

  it("validates draft image order payloads and delegates", async () => {
    const listingsService = {
      reorderDraftImages: vi.fn().mockResolvedValue({ images: { items: [] } }),
    } as unknown as ListingsService
    const controller = new ListingsController(
      listingsService,
      createRateLimitService()
    )

    await controller.reorderDraftImages(
      createAuth(),
      { id: "00000000-0000-0000-0000-000000000001" },
      {
        imageIds: [
          "00000000-0000-0000-0000-000000000002",
          "00000000-0000-0000-0000-000000000003",
        ],
      }
    )

    expect(listingsService.reorderDraftImages).toHaveBeenCalledWith(
      "user-id",
      "00000000-0000-0000-0000-000000000001",
      {
        imageIds: [
          "00000000-0000-0000-0000-000000000002",
          "00000000-0000-0000-0000-000000000003",
        ],
      }
    )
  })

  it("validates draft image cover ids and delegates", async () => {
    const listingsService = {
      setDraftImageCover: vi.fn().mockResolvedValue({ image: {} }),
    } as unknown as ListingsService
    const controller = new ListingsController(
      listingsService,
      createRateLimitService()
    )

    await controller.setDraftImageCover(createAuth(), {
      id: "00000000-0000-0000-0000-000000000001",
      imageId: "00000000-0000-0000-0000-000000000002",
    })

    expect(listingsService.setDraftImageCover).toHaveBeenCalledWith(
      "user-id",
      "00000000-0000-0000-0000-000000000001",
      "00000000-0000-0000-0000-000000000002"
    )
  })

  it("validates draft image delete ids and delegates", async () => {
    const listingsService = {
      deleteDraftImage: vi.fn().mockResolvedValue({ deleted: true }),
    } as unknown as ListingsService
    const controller = new ListingsController(
      listingsService,
      createRateLimitService()
    )

    await controller.deleteDraftImage(createAuth(), {
      id: "00000000-0000-0000-0000-000000000001",
      imageId: "00000000-0000-0000-0000-000000000002",
    })

    expect(listingsService.deleteDraftImage).toHaveBeenCalledWith(
      "user-id",
      "00000000-0000-0000-0000-000000000001",
      "00000000-0000-0000-0000-000000000002"
    )
  })

  it("rejects invalid draft ids", async () => {
    const listingsService = {
      draft: vi.fn(),
    } as unknown as ListingsService
    const controller = new ListingsController(
      listingsService,
      createRateLimitService()
    )

    await expect(
      controller.draft(createAuth(), { id: "not-a-uuid" })
    ).rejects.toBeInstanceOf(BadRequestException)
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

function createRateLimitService() {
  return {
    enforce: vi.fn().mockResolvedValue(undefined),
  } as unknown as RateLimitService
}

function createRequest() {
  return {
    ip: "203.0.113.10",
  } as const
}
