import { BadRequestException } from "@nestjs/common"
import { describe, expect, it, vi } from "vitest"

import { ListingsController } from "./listings.controller.js"
import type { ListingsService } from "./listings.service.js"

describe("ListingsController", () => {
  it("validates public listing queries and delegates", async () => {
    const listingsService = {
      listPublic: vi.fn().mockResolvedValue({ items: [], meta: {} }),
    } as unknown as ListingsService
    const controller = new ListingsController(listingsService)

    await controller.listPublic({
      page: "2",
      pageSize: "10",
      ageMonthsMin: "2",
      ageMonthsMax: "12",
      hasImages: "true",
      hasMicrochip: "false",
      isFree: "true",
      sex: "female",
      regionId: "00000000-0000-0000-0000-000000000001",
    })

    expect(listingsService.listPublic).toHaveBeenCalledWith({
      page: 2,
      pageSize: 10,
      ageMonthsMin: 2,
      ageMonthsMax: 12,
      hasImages: true,
      hasMicrochip: false,
      isFree: true,
      sex: "female",
      regionId: "00000000-0000-0000-0000-000000000001",
    })
  })

  it("rejects invalid public listing queries", async () => {
    const listingsService = {
      listPublic: vi.fn(),
    } as unknown as ListingsService
    const controller = new ListingsController(listingsService)

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
    const controller = new ListingsController(listingsService)

    await expect(
      controller.listPublic({
        ageMonthsMin: "24",
        ageMonthsMax: "12",
      })
    ).rejects.toBeInstanceOf(BadRequestException)
    expect(listingsService.listPublic).not.toHaveBeenCalled()
  })

  it("validates public listing ids and delegates", async () => {
    const listingsService = {
      publicDetail: vi.fn().mockResolvedValue({ id: "listing-id" }),
    } as unknown as ListingsService
    const controller = new ListingsController(listingsService)

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
    const controller = new ListingsController(listingsService)

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
    const controller = new ListingsController(listingsService)

    await controller.createDraft(createAuth(), {
      title: "  Gattino a Roma  ",
      description: "  Cerca una famiglia  ",
    })

    expect(listingsService.createDraft).toHaveBeenCalledWith("user-id", {
      title: "Gattino a Roma",
      description: "Cerca una famiglia",
      sex: "unknown",
      isFree: true,
    })
  })

  it("rejects invalid draft update payloads", async () => {
    const listingsService = {
      updateDraft: vi.fn(),
    } as unknown as ListingsService
    const controller = new ListingsController(listingsService)

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
    const controller = new ListingsController(listingsService)

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
    const controller = new ListingsController(listingsService)

    await controller.createDraftImageUpload(
      createAuth(),
      { id: "00000000-0000-0000-0000-000000000001" },
      {
        mimeType: "image/webp",
        sizeBytes: "123456",
        isCover: true,
      }
    )

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
    const controller = new ListingsController(listingsService)

    await controller.confirmDraftImageUpload(createAuth(), {
      id: "00000000-0000-0000-0000-000000000001",
      imageId: "00000000-0000-0000-0000-000000000002",
    })

    expect(listingsService.confirmDraftImageUpload).toHaveBeenCalledWith(
      "user-id",
      "00000000-0000-0000-0000-000000000001",
      "00000000-0000-0000-0000-000000000002"
    )
  })

  it("rejects invalid draft ids", async () => {
    const listingsService = {
      draft: vi.fn(),
    } as unknown as ListingsService
    const controller = new ListingsController(listingsService)

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
