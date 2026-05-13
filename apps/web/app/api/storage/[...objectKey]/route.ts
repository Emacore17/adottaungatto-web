import { NextResponse } from "next/server"

import { webEnv } from "@/lib/config/env"

type StorageRouteContext = {
  params: Promise<{
    objectKey: string[]
  }>
}

export const dynamic = "force-dynamic"

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
    return NextResponse.json({ message: "Image not found." }, { status: 404 })
  }

  let response: Response

  try {
    response = await fetch(
      `${webEnv.storagePublicUrl}/${webEnv.storageBucket}/${encodeObjectKey(objectKey)}`,
      { cache: "no-store" }
    )
  } catch {
    return NextResponse.json(
      { message: "Image storage is not reachable." },
      { status: 502 }
    )
  }

  if (!response.ok || !response.body) {
    return NextResponse.json({ message: "Image not found." }, { status: 404 })
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
    response.headers.get("cache-control") ??
      "public, max-age=31536000, immutable"
  )

  return new Response(response.body, {
    headers,
    status: response.status,
  })
}
