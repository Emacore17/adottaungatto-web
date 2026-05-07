import { NotFoundException } from "@nestjs/common"
import { describe, expect, it, vi } from "vitest"

import type { DatabaseService } from "../database/database.service.js"
import { FavoritesService } from "./favorites.service.js"

describe("FavoritesService", () => {
  it("lists favorite public listings", async () => {
    const databaseService = {
      queryRows: vi.fn().mockResolvedValue([
        createFavoriteRow({
          total_count: "1",
          municipality_id: "municipality-id",
          municipality_name: "Roma",
          municipality_istat_code: "058091",
          province_id: "province-id",
          province_name: "Roma",
          province_istat_code: "058",
          region_id: "region-id",
          region_name: "Lazio",
          region_istat_code: "12",
          cover_image_id: "image-id",
          cover_object_key_thumb: "listings/listing-id/thumb.webp",
          cover_object_key_large: "listings/listing-id/large.webp",
        }),
      ]),
    } as unknown as DatabaseService
    const service = new FavoritesService(databaseService)

    await expect(
      service.listFavorites("user-id", {
        page: 2,
        pageSize: 10,
      })
    ).resolves.toEqual({
      items: [
        {
          favoritedAt: "2026-05-01T10:00:00.000Z",
          listing: {
            id: "listing-id",
            title: "Gattino a Roma",
            slug: "gattino-a-roma",
            description: "Cerca casa",
            publishedAt: "2026-04-20T10:00:00.000Z",
            expiresAt: null,
            owner: {
              id: "owner-id",
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
                objectKeyThumb: "listings/listing-id/thumb.webp",
                objectKeyLarge: "listings/listing-id/large.webp",
              },
            },
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
    expect(databaseService.queryRows).toHaveBeenCalledWith(expect.any(String), [
      "user-id",
      10,
      10,
    ])
  })

  it("adds a favorite for a public listing", async () => {
    const databaseService = {
      queryRows: vi.fn().mockResolvedValue([
        {
          ...createFavoriteRow(),
          created: true,
        },
      ]),
    } as unknown as DatabaseService
    const service = new FavoritesService(databaseService)

    await expect(
      service.addFavorite("user-id", "listing-id")
    ).resolves.toMatchObject({
      favorited: true,
      created: true,
      item: {
        listing: {
          id: "listing-id",
        },
      },
    })
    expect(databaseService.queryRows).toHaveBeenCalledWith(expect.any(String), [
      "user-id",
      "listing-id",
    ])
  })

  it("returns created false when the favorite already exists", async () => {
    const databaseService = {
      queryRows: vi.fn().mockResolvedValue([
        {
          ...createFavoriteRow(),
          created: false,
        },
      ]),
    } as unknown as DatabaseService
    const service = new FavoritesService(databaseService)

    await expect(
      service.addFavorite("user-id", "listing-id")
    ).resolves.toMatchObject({
      favorited: true,
      created: false,
    })
  })

  it("rejects favorites for non-public listings", async () => {
    const databaseService = {
      queryRows: vi.fn().mockResolvedValue([]),
    } as unknown as DatabaseService
    const service = new FavoritesService(databaseService)

    await expect(
      service.addFavorite("user-id", "missing-id")
    ).rejects.toBeInstanceOf(NotFoundException)
  })

  it("removes a favorite idempotently", async () => {
    const databaseService = {
      queryRows: vi
        .fn()
        .mockResolvedValueOnce([{ listing_id: "listing-id" }])
        .mockResolvedValueOnce([]),
    } as unknown as DatabaseService
    const service = new FavoritesService(databaseService)

    await expect(
      service.removeFavorite("user-id", "listing-id")
    ).resolves.toEqual({ deleted: true })
    await expect(
      service.removeFavorite("user-id", "listing-id")
    ).resolves.toEqual({ deleted: false })
  })
})

function createFavoriteRow(
  overrides: Partial<Record<string, unknown>> = {}
): Record<string, unknown> {
  return {
    favorite_created_at: "2026-05-01T10:00:00.000Z",
    listing_id: "listing-id",
    listing_title: "Gattino a Roma",
    listing_slug: "gattino-a-roma",
    listing_description: "Cerca casa",
    listing_published_at: "2026-04-20T10:00:00.000Z",
    listing_expires_at: null,
    owner_user_id: "owner-id",
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
    ready_image_count: "2",
    cover_image_id: null,
    cover_object_key_thumb: null,
    cover_object_key_large: null,
    ...overrides,
  }
}
