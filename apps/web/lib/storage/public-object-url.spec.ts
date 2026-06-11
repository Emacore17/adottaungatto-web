import { describe, expect, it } from "vitest"

import { createPublicObjectUrl } from "./public-object-url"

describe("createPublicObjectUrl", () => {
  it("uses path-style URLs when the public storage endpoint requires the bucket", () => {
    expect(
      createPublicObjectUrl({
        bucket: "adottaungatto-local",
        objectKey: "local/listings/cat photo.jpg",
        pathStyle: true,
        publicEndpoint: "http://localhost:9000",
      })
    ).toBe(
      "http://localhost:9000/adottaungatto-local/local/listings/cat%20photo.jpg"
    )
  })

  it("omits the bucket when the public storage endpoint is already bucket-scoped", () => {
    expect(
      createPublicObjectUrl({
        bucket: "adotta-dev-assets",
        objectKey: "production/listings/cat photo.jpg",
        pathStyle: false,
        publicEndpoint: "https://pub-123.r2.dev",
      })
    ).toBe("https://pub-123.r2.dev/production/listings/cat%20photo.jpg")
  })
})
