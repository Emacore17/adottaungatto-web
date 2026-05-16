type PublicObjectUrlOptions = {
  bucket: string
  objectKey: string
  pathStyle: boolean
  publicEndpoint: string
}

export function createPublicObjectUrl({
  bucket,
  objectKey,
  pathStyle,
  publicEndpoint,
}: PublicObjectUrlOptions) {
  const encodedObjectKey = encodeObjectKey(objectKey)
  const publicUrl = new URL(publicEndpoint)
  const pathPrefix = publicUrl.pathname.replace(/\/+$/, "")
  const objectPath = pathStyle
    ? `${encodeURIComponent(bucket)}/${encodedObjectKey}`
    : encodedObjectKey

  publicUrl.pathname = [pathPrefix, objectPath].filter(Boolean).join("/")
  publicUrl.search = ""

  return publicUrl.toString()
}

function encodeObjectKey(objectKey: string) {
  return objectKey.split("/").map(encodeURIComponent).join("/")
}
