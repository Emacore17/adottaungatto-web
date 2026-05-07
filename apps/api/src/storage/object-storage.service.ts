import { Inject, Injectable } from "@nestjs/common"
import { randomBytes } from "node:crypto"
import { Client } from "minio"
import type { ClientOptions } from "minio"
import type { ListingImageMimeType } from "@workspace/validation"

import { API_ENV } from "../config/config.module.js"
import type { ApiEnv } from "../config/env.js"

const presignedPutExpiresSeconds = 15 * 60

@Injectable()
export class ObjectStorageService {
  private readonly client: Client
  private bucketReady?: Promise<void>

  constructor(@Inject(API_ENV) private readonly env: ApiEnv) {
    this.client = new Client(createClientOptions(env))
  }

  async createPresignedPutUrl(objectKey: string): Promise<{
    expiresInSeconds: number
    url: string
  }> {
    await this.ensureBucket()

    const url = await this.client.presignedPutObject(
      this.env.S3_BUCKET,
      objectKey,
      presignedPutExpiresSeconds
    )

    return {
      expiresInSeconds: presignedPutExpiresSeconds,
      url: rewriteUrlOrigin(url, this.env.S3_PUBLIC_ENDPOINT),
    }
  }

  async createListingImageUpload(
    listingId: string,
    mimeType: ListingImageMimeType
  ): Promise<{
    expiresInSeconds: number
    objectKey: string
    url: string
  }> {
    const objectKey = createListingImageObjectKey(
      this.env.APP_ENV,
      listingId,
      mimeType
    )
    const upload = await this.createPresignedPutUrl(objectKey)

    return {
      ...upload,
      objectKey,
    }
  }

  async statObject(objectKey: string): Promise<{
    checksum: string
    sizeBytes: number
  }> {
    await this.ensureBucket()

    const stat = await this.client.statObject(this.env.S3_BUCKET, objectKey)

    return {
      checksum: stat.etag,
      sizeBytes: stat.size,
    }
  }

  private async ensureBucket() {
    this.bucketReady ??= this.createBucketIfMissing().catch((error) => {
      this.bucketReady = undefined
      throw error
    })

    await this.bucketReady
  }

  private async createBucketIfMissing() {
    const exists = await this.client.bucketExists(this.env.S3_BUCKET)

    if (!exists) {
      await this.client.makeBucket(this.env.S3_BUCKET, this.env.S3_REGION)
    }
  }
}

export function createListingImageObjectKey(
  appEnv: string,
  listingId: string,
  mimeType: ListingImageMimeType
) {
  const extensionByMimeType: Record<ListingImageMimeType, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  }
  const normalizedEnv = appEnv
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
  const randomId = randomBytes(16).toString("hex")

  return `${normalizedEnv || "local"}/listings/${listingId}/original/${randomId}.${extensionByMimeType[mimeType]}`
}

export function createClientOptions(env: ApiEnv): ClientOptions {
  const endpoint = new URL(env.S3_ENDPOINT)
  const port = endpoint.port
    ? Number(endpoint.port)
    : endpoint.protocol === "https:"
      ? 443
      : 80

  return {
    endPoint: endpoint.hostname,
    port,
    useSSL: endpoint.protocol === "https:",
    accessKey: env.S3_ACCESS_KEY_ID,
    secretKey: env.S3_SECRET_ACCESS_KEY,
    region: env.S3_REGION,
    pathStyle: true,
  }
}

export function rewriteUrlOrigin(url: string, publicEndpoint: string): string {
  const signedUrl = new URL(url)
  const publicUrl = new URL(publicEndpoint)

  signedUrl.protocol = publicUrl.protocol
  signedUrl.host = publicUrl.host

  return signedUrl.toString()
}
