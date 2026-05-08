import { NotFoundException } from "@nestjs/common"
import { describe, expect, it, vi } from "vitest"

import type { DatabaseService } from "../database/database.service.js"
import type { ListingSearchDocumentsService } from "../listing-search-documents/listing-search-documents.service.js"
import { LikesService } from "./likes.service.js"

describe("LikesService", () => {
  it("returns the public like count for a published listing", async () => {
    const databaseService = {
      queryRows: vi.fn().mockResolvedValue([
        {
          listing_id: "listing-id",
          like_count: "7",
        },
      ]),
    } as unknown as DatabaseService
    const { service } = createService(databaseService)

    await expect(service.publicLikeCount("listing-id")).resolves.toEqual({
      listingId: "listing-id",
      likeCount: 7,
    })
    expect(databaseService.queryRows).toHaveBeenCalledWith(expect.any(String), [
      "listing-id",
    ])
  })

  it("returns not found for non-public like count targets", async () => {
    const databaseService = {
      queryRows: vi.fn().mockResolvedValue([]),
    } as unknown as DatabaseService
    const { service } = createService(databaseService)

    await expect(service.publicLikeCount("listing-id")).rejects.toBeInstanceOf(
      NotFoundException
    )
  })

  it("likes a public listing", async () => {
    const databaseService = {
      queryRows: vi.fn().mockResolvedValue([
        {
          listing_id: "listing-id",
          like_count: "3",
          changed: true,
        },
      ]),
    } as unknown as DatabaseService
    const { listingSearchDocumentsService, service } =
      createService(databaseService)

    await expect(service.likeListing("user-id", "listing-id")).resolves.toEqual(
      {
        listingId: "listing-id",
        likeCount: 3,
        liked: true,
        changed: true,
      }
    )
    expect(databaseService.queryRows).toHaveBeenCalledWith(expect.any(String), [
      "user-id",
      "listing-id",
    ])
    expect(listingSearchDocumentsService.refreshListing).toHaveBeenCalledWith(
      "listing-id"
    )
  })

  it("returns changed false when the like already exists", async () => {
    const databaseService = {
      queryRows: vi.fn().mockResolvedValue([
        {
          listing_id: "listing-id",
          like_count: "3",
          changed: false,
        },
      ]),
    } as unknown as DatabaseService
    const { listingSearchDocumentsService, service } =
      createService(databaseService)

    await expect(service.likeListing("user-id", "listing-id")).resolves.toEqual(
      {
        listingId: "listing-id",
        likeCount: 3,
        liked: true,
        changed: false,
      }
    )
    expect(listingSearchDocumentsService.refreshListing).not.toHaveBeenCalled()
  })

  it("rejects likes for non-public listings", async () => {
    const databaseService = {
      queryRows: vi.fn().mockResolvedValue([]),
    } as unknown as DatabaseService
    const { listingSearchDocumentsService, service } =
      createService(databaseService)

    await expect(
      service.likeListing("user-id", "listing-id")
    ).rejects.toBeInstanceOf(NotFoundException)
    expect(listingSearchDocumentsService.refreshListing).not.toHaveBeenCalled()
  })

  it("unlikes a listing idempotently", async () => {
    const databaseService = {
      queryRows: vi
        .fn()
        .mockResolvedValueOnce([
          {
            listing_id: "listing-id",
            like_count: "2",
            changed: true,
          },
        ])
        .mockResolvedValueOnce([
          {
            listing_id: "listing-id",
            like_count: "2",
            changed: false,
          },
        ]),
    } as unknown as DatabaseService
    const { listingSearchDocumentsService, service } =
      createService(databaseService)

    await expect(
      service.unlikeListing("user-id", "listing-id")
    ).resolves.toEqual({
      listingId: "listing-id",
      likeCount: 2,
      liked: false,
      changed: true,
    })
    await expect(
      service.unlikeListing("user-id", "listing-id")
    ).resolves.toEqual({
      listingId: "listing-id",
      likeCount: 2,
      liked: false,
      changed: false,
    })
    expect(listingSearchDocumentsService.refreshListing).toHaveBeenCalledTimes(
      1
    )
    expect(listingSearchDocumentsService.refreshListing).toHaveBeenCalledWith(
      "listing-id"
    )
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

  return {
    listingSearchDocumentsService,
    service: new LikesService(databaseService, listingSearchDocumentsService),
  }
}
