import Image, { type ImageProps } from "next/image"

type StorageImageProps = ImageProps

function StorageImage({ unoptimized = true, ...props }: StorageImageProps) {
  // Local S3-compatible storage can point to private hosts that Next optimizer rejects.
  return <Image {...props} unoptimized={unoptimized} />
}

export { StorageImage }
