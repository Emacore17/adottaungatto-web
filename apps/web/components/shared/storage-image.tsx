"use client"

import { useState, type SyntheticEvent } from "react"
import Image, { type ImageProps } from "next/image"
import { ImageIcon } from "lucide-react"

import { cn } from "@workspace/ui/lib/utils"

type StorageImageProps = ImageProps & {
  fallbackClassName?: string
}

function StorageImage({
  alt,
  className,
  fallbackClassName,
  onError,
  unoptimized = true,
  ...props
}: StorageImageProps) {
  const [failed, setFailed] = useState(false)

  if (failed) {
    return (
      <div
        aria-label={alt}
        role="img"
        className={cn(
          "flex size-full items-center justify-center bg-muted text-muted-foreground",
          props.fill ? "absolute inset-0" : undefined,
          fallbackClassName
        )}
      >
        <ImageIcon aria-hidden="true" className="size-5" />
      </div>
    )
  }

  // Local S3-compatible storage can point to private hosts that Next optimizer rejects.
  return (
    <Image
      {...props}
      alt={alt}
      className={className}
      unoptimized={unoptimized}
      onError={(event: SyntheticEvent<HTMLImageElement, Event>) => {
        setFailed(true)
        onError?.(event)
      }}
    />
  )
}

export { StorageImage }
