import { describe, expect, it } from "vitest"

import type { PublicListingDetail } from "@/lib/api/types"

import { createCarouselImages } from "./listing-carousel-images"

describe("createCarouselImages", () => {
  it("preserves blur data urls for listing detail carousel images", () => {
    const listing = {
      title: "Leo",
      images: {
        cover: null,
        items: [
          {
            id: "image-id",
            objectKeyLarge: "demo/listings/leo-large.webp",
            objectKeyThumb: "demo/listings/leo-thumb.webp",
            width: 1200,
            height: 900,
            blurHash: null,
            blurDataUrl: "data:image/webp;base64,AAAA",
            sortOrder: 0,
            isCover: true,
          },
        ],
      },
    } as PublicListingDetail

    expect(createCarouselImages(listing)).toEqual([
      {
        alt: "Leo - foto 1",
        blurDataUrl: "data:image/webp;base64,AAAA",
        id: "image-id",
        isCover: true,
        thumbUrl: "/api/storage/demo/listings/leo-thumb.webp?v=mutable-v1",
        url: "/api/storage/demo/listings/leo-large.webp?v=mutable-v1",
      },
    ])
  })
})
