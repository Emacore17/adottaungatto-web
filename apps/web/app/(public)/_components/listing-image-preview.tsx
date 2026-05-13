"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ImageIcon } from "lucide-react"

import { StorageImage } from "@/components/shared/storage-image"
import { cn } from "@workspace/ui/lib/utils"

type ListingPreviewImage = {
  alt: string
  id: string
  url: string
}

type ListingImagePreviewProps = {
  className?: string
  href: string
  images: ListingPreviewImage[]
  title: string
}

function ListingImagePreview({
  className,
  href,
  images,
  title,
}: ListingImagePreviewProps) {
  const [isHovering, setIsHovering] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const hasImages = images.length > 0
  const hasMultipleImages = images.length > 1

  useEffect(() => {
    if (!isHovering || !hasMultipleImages) {
      return
    }

    const interval = window.setInterval(() => {
      setCurrentIndex((index) => (index + 1) % images.length)
    }, 1800)

    return () => {
      window.clearInterval(interval)
    }
  }, [hasMultipleImages, images.length, isHovering])

  return (
    <Link
      href={href}
      aria-label={`Apri annuncio ${title}`}
      className={cn(
        "relative block size-full overflow-hidden rounded-lg bg-card",
        className
      )}
      data-listing-image-preview
      data-preview-count={images.length}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => {
        setIsHovering(false)
        setCurrentIndex(0)
      }}
    >
      {hasImages ? (
        images.map((image, index) => (
          <StorageImage
            key={image.id}
            src={image.url}
            alt={index === 0 ? image.alt : ""}
            fill
            className={cn(
              "object-contain p-2 transition-[opacity,transform] duration-700 ease-out",
              index === currentIndex
                ? "scale-100 opacity-100"
                : "scale-[1.015] opacity-0"
            )}
            sizes="(min-width: 768px) 18rem, (min-width: 640px) 16rem, 100vw"
          />
        ))
      ) : (
        <div className="flex size-full flex-col items-center justify-center gap-2 px-4 text-center text-sm text-muted-foreground">
          <ImageIcon aria-hidden="true" />
          Foto in preparazione
        </div>
      )}

      {hasMultipleImages ? (
        <div className="pointer-events-none absolute right-3 bottom-3 flex gap-1.5">
          {images.map((image, index) => (
            <span
              key={image.id}
              className={cn(
                "block h-1.5 rounded-full bg-background/90 shadow-sm transition-[width,opacity]",
                index === currentIndex ? "w-5 opacity-100" : "w-1.5 opacity-70"
              )}
            />
          ))}
        </div>
      ) : null}
    </Link>
  )
}

export { ListingImagePreview, type ListingPreviewImage }
