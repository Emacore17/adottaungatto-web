import { Readable } from "node:stream"

import { createDatabase, refreshListingSearchDocumentSql } from "@workspace/db"
import { Client } from "minio"
import type { ClientOptions } from "minio"
import sharp from "sharp"

type StorageOptions = {
  accessKeyId: string
  bucket: string
  endpoint: string
  region: string
  secretAccessKey: string
}

type ProcessPendingListingImagesOptions = {
  databaseUrl: string
  storage: StorageOptions
  limit?: number
}

type PendingImageRow = {
  id: string
  listing_id: string
  object_key_original: string
}

type ImageProcessingResult = {
  imageId: string
  status: "ready" | "rejected"
  reason?: string
}

type ProcessedImage = {
  large: Buffer
  thumb: Buffer
  blurDataUrl: string
  width: number
  height: number
}

const largeMaxSize = 1600
const thumbSize = 512
const allowedInputFormats = new Set(["jpeg", "png", "webp"])

export async function processPendingListingImages(
  options: ProcessPendingListingImagesOptions
) {
  const limit = options.limit ?? 20
  const { client } = createDatabase(options.databaseUrl)
  const storageClient = new Client(createClientOptions(options.storage))

  try {
    const images = await client.unsafe<PendingImageRow[]>(
      `
        select
          listing_image.id::text,
          listing_image.listing_id::text,
          listing_image.object_key_original
        from listing_images listing_image
        join listings listing on listing.id = listing_image.listing_id
        where listing_image.status = 'processing'
          and listing_image.deleted_at is null
          and listing.deleted_at is null
        order by listing_image.updated_at, listing_image.created_at
        limit $1::int
      `,
      [limit]
    )
    const results: ImageProcessingResult[] = []

    for (const image of images) {
      results.push(await processPendingImage(client, storageClient, options.storage.bucket, image))
    }

    return {
      job: "process-listing-images",
      status: "ok",
      processed: results.length,
      ready: results.filter((result) => result.status === "ready").length,
      rejected: results.filter((result) => result.status === "rejected").length,
      results,
    }
  } finally {
    await client.end()
  }
}

export async function processImageBuffer(buffer: Buffer): Promise<ProcessedImage> {
  const metadata = await sharp(buffer).metadata()

  if (
    !metadata.format ||
    !allowedInputFormats.has(metadata.format) ||
    !metadata.width ||
    !metadata.height
  ) {
    throw new Error("Unsupported or invalid image.")
  }

  const normalized = sharp(buffer).rotate()
  const large = await normalized
    .clone()
    .resize({
      width: largeMaxSize,
      height: largeMaxSize,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: 82 })
    .toBuffer()
  const thumb = await normalized
    .clone()
    .resize({
      width: thumbSize,
      height: thumbSize,
      fit: "cover",
    })
    .webp({ quality: 78 })
    .toBuffer()
  const blurDataUrl = await createBlurDataUrl(normalized)

  return {
    large,
    thumb,
    blurDataUrl,
    width: metadata.width,
    height: metadata.height,
  }
}

async function createBlurDataUrl(image: sharp.Sharp) {
  const buffer = await image
    .clone()
    .resize({
      width: 16,
      height: 16,
      fit: "cover",
    })
    .blur(4)
    .webp({ quality: 45 })
    .toBuffer()

  return `data:image/webp;base64,${buffer.toString("base64")}`
}

export function createVariantObjectKey(
  originalObjectKey: string,
  variant: "large" | "thumb"
) {
  const pathParts = originalObjectKey.split("/")
  const fileName = pathParts.pop() ?? "image"
  const baseName = fileName.replace(/\.[^.]+$/, "")

  return [...pathParts.slice(0, -1), variant, `${baseName}.webp`].join("/")
}

export function createClientOptions(options: StorageOptions): ClientOptions {
  const endpoint = new URL(options.endpoint)
  const port = endpoint.port
    ? Number(endpoint.port)
    : endpoint.protocol === "https:"
      ? 443
      : 80

  return {
    endPoint: endpoint.hostname,
    port,
    useSSL: endpoint.protocol === "https:",
    accessKey: options.accessKeyId,
    secretKey: options.secretAccessKey,
    region: options.region,
    pathStyle: true,
  }
}

async function processPendingImage(
  databaseClient: ReturnType<typeof createDatabase>["client"],
  storageClient: Client,
  bucket: string,
  image: PendingImageRow
): Promise<ImageProcessingResult> {
  try {
    const original = await getObjectBuffer(
      storageClient,
      bucket,
      image.object_key_original
    )
    const processed = await processImageBuffer(original)
    const largeObjectKey = createVariantObjectKey(
      image.object_key_original,
      "large"
    )
    const thumbObjectKey = createVariantObjectKey(
      image.object_key_original,
      "thumb"
    )

    await storageClient.putObject(
      bucket,
      largeObjectKey,
      processed.large,
      processed.large.byteLength,
      { "Content-Type": "image/webp" }
    )
    await storageClient.putObject(
      bucket,
      thumbObjectKey,
      processed.thumb,
      processed.thumb.byteLength,
      { "Content-Type": "image/webp" }
    )
    await databaseClient.unsafe(
      `
        update listing_images
        set
          object_key_large = $2,
          object_key_thumb = $3,
          width = $4::int,
          height = $5::int,
          blur_data_url = $6,
          status = 'ready',
          rejection_reason = null,
          updated_at = now()
        where id = $1::uuid
          and status = 'processing'
          and deleted_at is null
      `,
      [
        image.id,
        largeObjectKey,
        thumbObjectKey,
        processed.width,
        processed.height,
        processed.blurDataUrl,
      ]
    )
    await refreshListingSearchDocument(databaseClient, image.listing_id)

    return {
      imageId: image.id,
      status: "ready",
    }
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Unknown error"

    await databaseClient.unsafe(
      `
        update listing_images
        set
          status = 'rejected',
          rejection_reason = $2,
          updated_at = now()
        where id = $1::uuid
          and status = 'processing'
          and deleted_at is null
      `,
      [image.id, reason.slice(0, 500)]
    )
    await refreshListingSearchDocument(databaseClient, image.listing_id)

    return {
      imageId: image.id,
      status: "rejected",
      reason,
    }
  }
}

async function refreshListingSearchDocument(
  databaseClient: ReturnType<typeof createDatabase>["client"],
  listingId: string
) {
  await databaseClient.unsafe(refreshListingSearchDocumentSql, [listingId])
}

async function getObjectBuffer(
  storageClient: Client,
  bucket: string,
  objectKey: string
) {
  const stream = await storageClient.getObject(bucket, objectKey)

  return streamToBuffer(stream)
}

function streamToBuffer(stream: Readable): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []

    stream.on("data", (chunk: Buffer | string) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
    })
    stream.on("error", reject)
    stream.on("end", () => {
      resolve(Buffer.concat(chunks))
    })
  })
}
