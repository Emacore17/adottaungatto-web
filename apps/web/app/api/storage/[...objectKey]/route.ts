import { NextResponse } from "next/server"

import { webEnv } from "@/lib/config/env"
import { privateNoStoreCacheControl } from "@/lib/http/responses"
import { createPublicObjectUrl } from "@/lib/storage/public-object-url"
import { createStorageImageCachePolicy } from "@/lib/storage/storage-image-cache"

type StorageRouteContext = {
  params: Promise<{
    objectKey: string[]
  }>
}

export const dynamic = "force-dynamic"

function readObjectKey(segments: string[]) {
  const objectKey = segments.join("/").replace(/^\/+/, "")

  if (!objectKey || objectKey.includes("..")) {
    return null
  }

  return objectKey
}

export async function GET(_request: Request, context: StorageRouteContext) {
  const params = await context.params
  const objectKey = readObjectKey(params.objectKey)

  if (!objectKey || !webEnv.storageBucket) {
    return imageErrorResponse("Image not found.", 404)
  }

  let response: Response
  const cachePolicy = createStorageImageCachePolicy({
    appEnv: webEnv.appEnv,
    objectKey,
  })

  try {
    response = await fetch(
      createStorageObjectUrl(objectKey),
      cachePolicy.fetchInit
    )
  } catch {
    return imageErrorResponse("Image storage is not reachable.", 502)
  }

  if (!response.ok || !response.body) {
    return imageErrorResponse("Image not found.", 404)
  }

  const headers = new Headers()
  const contentType = response.headers.get("content-type")
  const contentLength = response.headers.get("content-length")

  if (contentType) {
    headers.set("content-type", contentType)
  }

  if (contentLength) {
    headers.set("content-length", contentLength)
  }

  headers.set("cache-control", cachePolicy.responseCacheControl)

  return new Response(response.body, {
    headers,
    status: response.status,
  })
}

function createStorageObjectUrl(objectKey: string) {
  return createPublicObjectUrl({
    bucket: webEnv.storageBucket,
    objectKey,
    pathStyle: webEnv.storagePublicPathStyle,
    publicEndpoint: webEnv.storagePublicUrl,
  })
}

function imageErrorResponse(message: string, status: number) {
  return NextResponse.json(
    { message },
    {
      headers: {
        "Cache-Control": privateNoStoreCacheControl,
      },
      status,
    }
  )
}
