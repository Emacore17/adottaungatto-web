import { BadRequestException } from "@nestjs/common"
import { describe, expect, it, vi } from "vitest"

import type { CurrentAuthSessionResponse } from "../auth/auth.types.js"
import { LikesController } from "./likes.controller.js"
import type { LikesService } from "./likes.service.js"

describe("LikesController", () => {
  it("validates listing ids before returning public counts", async () => {
    const likesService = {
      publicLikeCount: vi.fn().mockResolvedValue({ likeCount: 4 }),
    } as unknown as LikesService
    const controller = new LikesController(likesService)

    await expect(
      controller.listingLikeCount({
        listingId: "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa",
      })
    ).resolves.toEqual({ likeCount: 4 })

    expect(likesService.publicLikeCount).toHaveBeenCalledWith(
      "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa"
    )
  })

  it("rejects invalid listing ids before public counts", async () => {
    const likesService = {
      publicLikeCount: vi.fn(),
    } as unknown as LikesService
    const controller = new LikesController(likesService)

    await expect(
      controller.listingLikeCount({
        listingId: "invalid",
      })
    ).rejects.toBeInstanceOf(BadRequestException)
    expect(likesService.publicLikeCount).not.toHaveBeenCalled()
  })

  it("validates listing ids before liking", async () => {
    const likesService = {
      likeListing: vi.fn().mockResolvedValue({ liked: true }),
    } as unknown as LikesService
    const controller = new LikesController(likesService)

    await expect(
      controller.likeListing(createAuth(), {
        listingId: "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa",
      })
    ).resolves.toEqual({ liked: true })

    expect(likesService.likeListing).toHaveBeenCalledWith(
      "user-id",
      "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa"
    )
  })

  it("rejects invalid listing ids before liking", async () => {
    const likesService = {
      likeListing: vi.fn(),
    } as unknown as LikesService
    const controller = new LikesController(likesService)

    await expect(
      controller.likeListing(createAuth(), {
        listingId: "invalid",
      })
    ).rejects.toBeInstanceOf(BadRequestException)
    expect(likesService.likeListing).not.toHaveBeenCalled()
  })

  it("validates listing ids before unliking", async () => {
    const likesService = {
      unlikeListing: vi.fn().mockResolvedValue({ liked: false }),
    } as unknown as LikesService
    const controller = new LikesController(likesService)

    await expect(
      controller.unlikeListing(createAuth(), {
        listingId: "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa",
      })
    ).resolves.toEqual({ liked: false })

    expect(likesService.unlikeListing).toHaveBeenCalledWith(
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
