import { describe, expect, it } from "vitest"

import { createStorageImageCachePolicy } from "./storage-image-cache"

describe("createStorageImageCachePolicy", () => {
  it("disables browser and server fetch caches outside production", () => {
    expect(
      createStorageImageCachePolicy({
        appEnv: "development",
        objectKey: "local/listings/listing-id/large/image.webp",
      })
    ).toEqual({
      fetchInit: {
        cache: "no-store",
      },
      responseCacheControl: "no-store, max-age=0",
    })
  })

  it("disables long-lived caches for mutable demo asset keys", () => {
    expect(
      createStorageImageCachePolicy({
        appEnv: "production",
        objectKey: "demo/listings/luna-large.png",
      })
    ).toEqual({
      fetchInit: {
        cache: "no-store",
      },
      responseCacheControl: "no-store, max-age=0",
    })
  })

  it("keeps production listing image objects cacheable when keys are immutable", () => {
    expect(
      createStorageImageCachePolicy({
        appEnv: "production",
        objectKey: "production/listings/listing-id/large/random-id.webp",
      })
    ).toEqual({
      fetchInit: {
        next: {
          revalidate: 86_400,
        },
      },
      responseCacheControl: "public, max-age=31536000, immutable",
    })
  })
})
