import { describe, expect, it, vi } from "vitest"

import type { DatabaseService } from "../database/database.service.js"
import { normalizePlaceQuery, PlacesService } from "./places.service.js"

describe("PlacesService", () => {
  it("normalizes place queries like the import worker", () => {
    expect(normalizePlaceQuery(" Valle d'Aostà ")).toBe("valle d aosta")
  })

  it("maps autocomplete rows to the public response shape", async () => {
    const databaseService = {
      queryRows: vi.fn().mockResolvedValue([
        {
          type: "municipality",
          id: "municipality-id",
          label: "Aosta",
          subtitle: "Comune, Valle d'Aosta/Vallée d'Aoste",
          istat_code: "007003",
          region_id: "region-id",
          region_name: "Valle d'Aosta/Vallée d'Aoste",
          region_istat_code: "02",
          province_id: "province-id",
          province_name: "Valle d'Aosta/Vallée d'Aoste",
          province_istat_code: "007",
          center_lat: null,
          center_lng: null,
        },
      ]),
    } as unknown as DatabaseService
    const service = new PlacesService(databaseService)

    const response = await service.autocomplete({
      q: " Aostà ",
      limit: 8,
    })

    expect(databaseService.queryRows).toHaveBeenCalledWith(expect.any(String), [
      "aosta",
      8,
      null,
    ])
    expect(response).toEqual({
      items: [
        {
          type: "municipality",
          id: "municipality-id",
          label: "Aosta",
          subtitle: "Comune, Valle d'Aosta/Vallée d'Aoste",
          istatCode: "007003",
          hierarchy: {
            region: {
              id: "region-id",
              name: "Valle d'Aosta/Vallée d'Aoste",
              istatCode: "02",
            },
            province: {
              id: "province-id",
              name: "Valle d'Aosta/Vallée d'Aoste",
              istatCode: "007",
            },
          },
          center: null,
        },
      ],
      meta: {
        query: " Aostà ",
        normalizedQuery: "aosta",
        limit: 8,
        type: "all",
      },
    })
  })

  it("maps nearby rows with distance in kilometers", async () => {
    const databaseService = {
      queryRows: vi.fn().mockResolvedValue([
        {
          type: "municipality",
          id: "municipality-id",
          label: "Aosta",
          subtitle: "Comune, Valle d'Aosta",
          istat_code: "007003",
          region_id: "region-id",
          region_name: "Valle d'Aosta",
          region_istat_code: "02",
          province_id: "province-id",
          province_name: "Valle d'Aosta",
          province_istat_code: "007",
          center_lat: 45.7495,
          center_lng: 7.3062,
          distance_meters: 1234.56,
        },
      ]),
    } as unknown as DatabaseService
    const service = new PlacesService(databaseService)

    const response = await service.nearby({
      lat: 45.75,
      lng: 7.3,
      radiusKm: 10,
      limit: 5,
    })

    expect(databaseService.queryRows).toHaveBeenCalledWith(expect.any(String), [
      7.3,
      45.75,
      10,
      5,
      null,
    ])
    expect(response.items[0]).toMatchObject({
      type: "municipality",
      label: "Aosta",
      distanceKm: 1.23,
      center: {
        lat: 45.7495,
        lng: 7.3062,
      },
    })
    expect(response.meta).toEqual({
      origin: {
        lat: 45.75,
        lng: 7.3,
      },
      radiusKm: 10,
      limit: 5,
      type: "all",
    })
  })
})
