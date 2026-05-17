type StorageObjectFetchInit = RequestInit & {
  next?: {
    revalidate: number
  }
}

type StorageImageCachePolicyOptions = {
  appEnv: string
  objectKey: string
}

type StorageImageCachePolicy = {
  fetchInit: StorageObjectFetchInit
  responseCacheControl: string
}

const immutableStorageImageCacheControl =
  "public, max-age=31536000, immutable"
const mutableStorageImageCacheControl = "no-store, max-age=0"
const mutableStorageImageUrlCacheVersion = "mutable-v1"
const storageImageRevalidateSeconds = 86_400

export function createStorageImageCachePolicy({
  appEnv,
  objectKey,
}: StorageImageCachePolicyOptions): StorageImageCachePolicy {
  if (isImmutableStorageObject(appEnv, objectKey)) {
    return {
      fetchInit: {
        next: {
          revalidate: storageImageRevalidateSeconds,
        },
      },
      responseCacheControl: immutableStorageImageCacheControl,
    }
  }

  return {
    fetchInit: {
      cache: "no-store",
    },
    responseCacheControl: mutableStorageImageCacheControl,
  }
}

export function createStorageImageUrlCacheVersion(objectKey: string) {
  return isDemoStorageObjectKey(objectKey)
    ? mutableStorageImageUrlCacheVersion
    : null
}

function isImmutableStorageObject(appEnv: string, objectKey: string) {
  return isProductionAppEnv(appEnv) && !isDemoStorageObjectKey(objectKey)
}

function isProductionAppEnv(appEnv: string) {
  return appEnv.trim().toLowerCase() === "production"
}

function isDemoStorageObjectKey(objectKey: string) {
  return objectKey.replace(/^\/+/, "").startsWith("demo/")
}
