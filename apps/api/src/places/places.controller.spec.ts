import { BadRequestException } from "@nestjs/common"
import { describe, expect, it, vi } from "vitest"

import { PlacesController } from "./places.controller.js"
import type { PlacesService } from "./places.service.js"

describe("PlacesController", () => {
  it("validates query params and delegates autocomplete", async () => {
    const placesService = {
      autocomplete: vi.fn().mockResolvedValue({ items: [], meta: {} }),
    } as unknown as PlacesService
    const controller = new PlacesController(placesService)

    await controller.autocomplete({ q: " Aosta ", limit: "5" })

    expect(placesService.autocomplete).toHaveBeenCalledWith({
      q: "Aosta",
      limit: 5,
    })
  })

  it("rejects short autocomplete queries", async () => {
    const placesService = {
      autocomplete: vi.fn(),
    } as unknown as PlacesService
    const controller = new PlacesController(placesService)

    await expect(controller.autocomplete({ q: "a" })).rejects.toBeInstanceOf(
      BadRequestException
    )
  })

  it("validates query params and delegates nearby", async () => {
    const placesService = {
      nearby: vi.fn().mockResolvedValue({ items: [], meta: {} }),
    } as unknown as PlacesService
    const controller = new PlacesController(placesService)

    await controller.nearby({
      lat: "45.75",
      lng: "7.3",
      radiusKm: "10",
      limit: "5",
      type: "municipality",
    })

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
    const controller = new PlacesController(placesService)

    await expect(
      controller.nearby({ lat: "120", lng: "7.3" })
    ).rejects.toBeInstanceOf(BadRequestException)
  })
})
