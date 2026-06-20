import { NextResponse } from "next/server"

import { webEnv } from "@/lib/config/env"
import { privateNoStoreCacheControl } from "@/lib/http/responses"
import { createPublicObjectUrl } from "@/lib/storage/public-object-url"

type StorageRouteContext = {
  params: Promise<{
    objectKey: string[]
  }>
}

export const dynamic = "force-dynamic"

const storageImageCacheControl = "public, max-age=31536000, immutable"

// Solo questi content-type vengono serviti con il loro tipo reale. Qualsiasi
// altro (HTML, SVG, ecc.) viene neutralizzato come download per evitare che il
// proxy, servito sullo stesso origin del sito, esegua contenuto caricato dagli
// utenti (stored XSS).
const allowedImageContentTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
])

function readObjectKey(segments: string[]) {
  const objectKey = segments.join("/").replace(/^\/+/, "")

  if (!objectKey || objectKey.includes("..")) {
    return null
  }

  // Gli originali caricati conservano i byte e il content-type scelti dal
  // client: non vanno mai serviti. Il sito mostra solo i derivati (large/thumb)
  // rigenerati dal worker.
  if (objectKey.split("/").includes("original")) {
    return null
  }

  return objectKey
}

function normalizeContentType(value: string | null) {
  return (value ?? "").split(";")[0]?.trim().toLowerCase() ?? ""
}

export async function GET(_request: Request, context: StorageRouteContext) {
  const params = await context.params
  const objectKey = readObjectKey(params.objectKey)

  if (!objectKey || !webEnv.storageBucket) {
    return imageErrorResponse("Image not found.", 404)
  }

  let response: Response

  try {
    response = await fetch(createStorageObjectUrl(objectKey), {
      next: {
        revalidate: 86_400,
      },
    })
  } catch {
    return imageErrorResponse("Image storage is not reachable.", 502)
  }

  if (!response.ok || !response.body) {
    return imageErrorResponse("Image not found.", 404)
  }

  const headers = new Headers()
  const upstreamContentType = normalizeContentType(
    response.headers.get("content-type")
  )
  const isAllowedImage = allowedImageContentTypes.has(upstreamContentType)
  const contentLength = response.headers.get("content-length")

  headers.set(
    "content-type",
    isAllowedImage ? upstreamContentType : "application/octet-stream"
  )
  headers.set("x-content-type-options", "nosniff")
  headers.set("content-disposition", isAllowedImage ? "inline" : "attachment")
  // Difesa in profondità: anche se un tipo riuscisse a passare, la risorsa non
  // può eseguire script né caricare sotto-risorse.
  headers.set("content-security-policy", "default-src 'none'; sandbox")

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
