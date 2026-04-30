import { describe, expect, it } from "vitest"

import {
  getFeatureIstatCode,
  inferBoundaryEntity,
} from "./import-italian-boundaries.js"

describe("Italian boundaries import", () => {
  it("infers boundary layer entities from Istat file names", () => {
    expect(inferBoundaryEntity("Reg01012026_g/Reg01012026_g_WGS84")).toBe(
      "region"
    )
    expect(inferBoundaryEntity("ProvCM01012026_g/ProvCM01012026_g_WGS84")).toBe(
      "province"
    )
    expect(inferBoundaryEntity("Com01012026_g/Com01012026_g_WGS84")).toBe(
      "municipality"
    )
    expect(
      inferBoundaryEntity("RipGeo01012026_g/RipGeo01012026_g_WGS84")
    ).toBeUndefined()
  })

  it("normalizes Istat codes from shapefile properties", () => {
    expect(getFeatureIstatCode("region", { COD_REG: 2 })).toBe("02")
    expect(getFeatureIstatCode("province", { COD_UTS: 7 })).toBe("007")
    expect(getFeatureIstatCode("province", { COD_UTS: 201 })).toBe("201")
    expect(getFeatureIstatCode("municipality", { PRO_COM_T: "001001" })).toBe(
      "001001"
    )
    expect(getFeatureIstatCode("municipality", { PRO_COM: 1001 })).toBe(
      "001001"
    )
  })
})
