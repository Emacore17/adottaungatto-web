import sharp from "sharp"
import { describe, expect, it } from "vitest"

import {
  createClientOptions,
  createVariantObjectKey,
  processImageBuffer,
} from "./process-listing-images.js"

describe("process-listing-images", () => {
  it("creates variant object keys next to the original image path", () => {
    expect(
      createVariantObjectKey(
        "local/listings/listing-id/original/random.jpg",
        "thumb"
      )
    ).toBe("local/listings/listing-id/thumb/random.webp")
  })

  it("creates MinIO client options", () => {
    expect(
      createClientOptions({
        accessKeyId: "access-key",
        bucket: "bucket",
        endpoint: "http://localhost:9000",
        region: "local",
        secretAccessKey: "secret-key",
      })
    ).toMatchObject({
      endPoint: "localhost",
      port: 9000,
      useSSL: false,
      accessKey: "access-key",
      secretKey: "secret-key",
      region: "local",
      pathStyle: true,
    })
  })

  it("validates images and creates large and thumb webp variants", async () => {
    const input = await sharp({
      create: {
        width: 1200,
        height: 800,
        channels: 3,
        background: "#ffffff",
      },
    })
      .jpeg()
      .toBuffer()

    const processed = await processImageBuffer(input)
    const largeMetadata = await sharp(processed.large).metadata()
    const thumbMetadata = await sharp(processed.thumb).metadata()

    expect(processed.width).toBe(1200)
    expect(processed.height).toBe(800)
    expect(largeMetadata.format).toBe("webp")
    expect(largeMetadata.width).toBe(1200)
    expect(largeMetadata.height).toBe(800)
    expect(thumbMetadata.format).toBe("webp")
    expect(thumbMetadata.width).toBe(512)
    expect(thumbMetadata.height).toBe(512)
    expect(processed.blurDataUrl).toMatch(
      /^data:image\/webp;base64,[A-Za-z0-9+/=]+$/
    )
    expect(
      Buffer.from(processed.blurDataUrl.split(",")[1] ?? "", "base64")
        .byteLength
    ).toBeGreaterThan(0)
  })
})
