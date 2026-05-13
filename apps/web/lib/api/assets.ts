export function getPublicObjectUrl(objectKey: string | null | undefined) {
  if (!objectKey) {
    return null
  }

  return `/api/storage/${objectKey
    .replace(/^\/+/, "")
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`
}
