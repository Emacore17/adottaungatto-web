import { webEnv } from "@/lib/config/env"

export function getPublicObjectUrl(objectKey: string | null | undefined) {
  if (!objectKey || !webEnv.storageBucket) {
    return null
  }

  return `${webEnv.storagePublicUrl}/${webEnv.storageBucket}/${objectKey.replace(/^\/+/, "")}`
}
