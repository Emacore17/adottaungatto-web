import { createStorageImageUrlCacheVersion } from "../storage/storage-image-cache"

export function getPublicObjectUrl(objectKey: string | null | undefined) {
  if (!objectKey) {
    return null
  }

  const normalizedObjectKey = objectKey.replace(/^\/+/, "")
  const encodedObjectKey = normalizedObjectKey
    .split("/")
    .map(encodeURIComponent)
    .join("/")
  const cacheVersion = createStorageImageUrlCacheVersion(normalizedObjectKey)
  const searchParams = cacheVersion
    ? `?v=${encodeURIComponent(cacheVersion)}`
    : ""

  return `/api/storage/${encodedObjectKey}${searchParams}`
}
