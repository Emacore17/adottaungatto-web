import { BadRequestException } from "@nestjs/common"
import { describe, expect, it, vi } from "vitest"

import type { RateLimitService } from "../rate-limit/rate-limit.service.js"
import { PlacesController } from "./places.controller.js"
import type { PlacesService } from "./places.service.js"

describe("PlacesController", () => {
  it("validates query params and delegates autocomplete", async () => {
    const placesService = {
      autocomplete: vi.fn().mockResolvedValue({ items: [], meta: {} }),
    } as unknown as PlacesService
    const rateLimitService = createRateLimitService()
    const controller = new PlacesController(placesService, rateLimitService)

    await controller.autocomplete({ q: " Aosta ", limit: "5" }, createRequest())

    expect(rateLimitService.enforce).toHaveBeenCalledWith([
      expect.objectContaining({
        identifier: "ip:203.0.113.20",
        namespace: "places:autocomplete:ip",
      }),
    ])
    expect(placesService.autocomplete).toHaveBeenCalledWith({
      q: "Aosta",
      limit: 5,
    })
  })

  it("rejects short autocomplete queries", async () => {
    const placesService = {
      autocomplete: vi.fn(),
    } as unknown as PlacesService
    const controller = new PlacesController(
      placesService,
      createRateLimitService()
    )

    await expect(controller.autocomplete({ q: "a" })).rejects.toBeInstanceOf(
      BadRequestException
    )
  })

  it("validates query params and delegates nearby", async () => {
    const placesService = {
      nearby: vi.fn().mockResolvedValue({ items: [], meta: {} }),
    } as unknown as PlacesService
    const rateLimitService = createRateLimitService()
    const controller = new PlacesController(placesService, rateLimitService)

    await controller.nearby(
      {
        lat: "45.75",
        lng: "7.3",
        radiusKm: "10",
        limit: "5",
        type: "municipality",
      },
      createRequest()
    )

    expect(rateLimitService.enforce).toHaveBeenCalledWith([
      expect.objectContaining({
        identifier: "ip:203.0.113.20",
        namespace: "places:nearby:ip",
      }),
    ])
    expect(placesService.nearby).toHaveBeenCalledWith({
      lat: 45.75,
      lng: 7.3,
      radiusKm: 10,
      limit: 5,
      type: "municipality",
    })
  })

  it("rejects invalid nearby coordinates", async () => {
    const placesService = {
      nearby: vi.fn(),
    } as unknown as PlacesService
    const controller = new PlacesController(
      placesService,
      createRateLimitService()
    )

    await expect(
      controller.nearby({ lat: "120", lng: "7.3" })
    ).rejects.toBeInstanceOf(BadRequestException)
  })
})

function createRateLimitService() {
  return {
    enforce: vi.fn().mockResolvedValue(undefined),
  } as unknown as RateLimitService
}

function createRequest() {
  return {
    ip: "203.0.113.20",
  } as const
}
