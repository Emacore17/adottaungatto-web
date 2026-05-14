import { NextResponse } from "next/server"

import { webEnv } from "@/lib/config/env"
import { privateNoStoreCacheControl } from "@/lib/http/responses"

type StorageRouteContext = {
  params: Promise<{
    objectKey: string[]
  }>
}

export const dynamic = "force-dynamic"

const storageImageCacheControl = "public, max-age=31536000, immutable"

function encodeObjectKey(objectKey: string) {
  return objectKey.split("/").map(encodeURIComponent).join("/")
}

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

  try {
    response = await fetch(
      `${webEnv.storagePublicUrl}/${webEnv.storageBucket}/${encodeObjectKey(objectKey)}`,
      {
        next: {
          revalidate: 86_400,
        },
      }
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

  headers.set(
    "cache-control",
    response.headers.get("cache-control") ?? storageImageCacheControl
  )

  return new Response(response.body, {
    headers,
    status: response.status,
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
