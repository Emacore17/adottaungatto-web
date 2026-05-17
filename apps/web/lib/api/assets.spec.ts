import { describe, expect, it } from "vitest"

import { getPublicObjectUrl } from "./assets"

describe("getPublicObjectUrl", () => {
  it("adds a cache-busting query for mutable demo storage objects", () => {
    expect(getPublicObjectUrl("demo/listings/luna-large.png")).toBe(
      "/api/storage/demo/listings/luna-large.png?v=mutable-v1"
    )
  })

  it("keeps immutable listing object URLs stable", () => {
    expect(
      getPublicObjectUrl("production/listings/listing-id/large/image.webp")
    ).toBe("/api/storage/production/listings/listing-id/large/image.webp")
  })

  it("encodes object key path segments without encoding slashes", () => {
    expect(getPublicObjectUrl("demo/listings/cat photo.png")).toBe(
      "/api/storage/demo/listings/cat%20photo.png?v=mutable-v1"
    )
  })
})
