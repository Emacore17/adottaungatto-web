import { BadRequestException } from "@nestjs/common"
import { describe, expect, it, vi } from "vitest"

import type { CurrentAuthSessionResponse } from "../auth/auth.types.js"
import { FavoritesController } from "./favorites.controller.js"
import type { FavoritesService } from "./favorites.service.js"

describe("FavoritesController", () => {
  it("validates favorite list queries and delegates", async () => {
    const favoritesService = {
      listFavorites: vi.fn().mockResolvedValue({ items: [], meta: {} }),
    } as unknown as FavoritesService
    const controller = new FavoritesController(favoritesService)

    await expect(
      controller.listListings(createAuth(), {
        page: "2",
        pageSize: "10",
      })
    ).resolves.toEqual({ items: [], meta: {} })

    expect(favoritesService.listFavorites).toHaveBeenCalledWith("user-id", {
      page: 2,
      pageSize: 10,
    })
  })

  it("rejects invalid favorite list queries", async () => {
    const favoritesService = {
      listFavorites: vi.fn(),
    } as unknown as FavoritesService
    const controller = new FavoritesController(favoritesService)

    await expect(
      controller.listListings(createAuth(), {
        page: "0",
      })
    ).rejects.toBeInstanceOf(BadRequestException)
    expect(favoritesService.listFavorites).not.toHaveBeenCalled()
  })

  it("validates listing ids before adding a favorite", async () => {
    const favoritesService = {
      addFavorite: vi.fn().mockResolvedValue({ favorited: true }),
    } as unknown as FavoritesService
    const controller = new FavoritesController(favoritesService)

    await expect(
      controller.addListing(createAuth(), {
        listingId: "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa",
      })
    ).resolves.toEqual({ favorited: true })

    expect(favoritesService.addFavorite).toHaveBeenCalledWith(
      "user-id",
      "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa"
    )
  })

  it("rejects invalid ids before adding a favorite", async () => {
    const favoritesService = {
      addFavorite: vi.fn(),
    } as unknown as FavoritesService
    const controller = new FavoritesController(favoritesService)

    await expect(
      controller.addListing(createAuth(), {
        listingId: "invalid",
      })
    ).rejects.toBeInstanceOf(BadRequestException)
    expect(favoritesService.addFavorite).not.toHaveBeenCalled()
  })

  it("validates listing ids before removing a favorite", async () => {
    const favoritesService = {
      removeFavorite: vi.fn().mockResolvedValue({ deleted: true }),
    } as unknown as FavoritesService
    const controller = new FavoritesController(favoritesService)

    await expect(
      controller.removeListing(createAuth(), {
        listingId: "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa",
      })
    ).resolves.toEqual({ deleted: true })

    expect(favoritesService.removeFavorite).toHaveBeenCalledWith(
      "user-id",
      "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa"
    )
  })
})

function createAuth(): CurrentAuthSessionResponse {
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
  }
}
