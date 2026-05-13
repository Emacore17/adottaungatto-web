"use client"

import { useState } from "react"
import { ChevronLeftIcon, ChevronRightIcon, ImageIcon } from "lucide-react"

import { StorageImage } from "@/components/shared/storage-image"
import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

export type ListingCarouselImage = {
  alt: string
  id: string
  isCover: boolean
  thumbUrl: string
  url: string
}

type ListingImageCarouselProps = {
  images: ListingCarouselImage[]
  title: string
}

function ListingImageCarousel({ images, title }: ListingImageCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const safeIndex = Math.min(currentIndex, Math.max(images.length - 1, 0))
  const currentImage = images[safeIndex]
  const hasMultipleImages = images.length > 1

  if (!currentImage) {
    return (
      <div className="flex aspect-[16/10] items-center justify-center rounded-lg bg-muted px-4 text-center text-sm text-muted-foreground">
        <ImageIcon aria-hidden="true" />
        Foto in preparazione
      </div>
    )
  }

  function showPreviousImage() {
    setCurrentIndex((index) => (index === 0 ? images.length - 1 : index - 1))
  }

  function showNextImage() {
    setCurrentIndex((index) => (index + 1) % images.length)
  }

  return (
    <section
      aria-label={`Foto annuncio ${title}`}
      className="flex flex-col gap-3"
      data-listing-carousel
      data-carousel-count={images.length}
    >
      <div className="relative aspect-[16/10] overflow-hidden rounded-lg border border-border/80 bg-muted p-2">
        <StorageImage
          key={currentImage.id}
          src={currentImage.url}
          alt={currentImage.alt}
          fill
          priority={safeIndex === 0}
          className="object-contain p-2"
          sizes="(min-width: 1024px) 768px, 100vw"
        />

        {hasMultipleImages ? (
          <>
            <div className="absolute top-3 right-3 rounded-md bg-background/90 px-2 py-1 text-xs font-medium text-foreground shadow-xs">
              {safeIndex + 1}/{images.length}
            </div>
            <div className="absolute inset-x-3 top-1/2 flex -translate-y-1/2 justify-between gap-3">
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="Foto precedente"
                onClick={showPreviousImage}
                className="bg-background/90"
              >
                <ChevronLeftIcon data-icon="inline-start" aria-hidden="true" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="Foto successiva"
                onClick={showNextImage}
                className="bg-background/90"
              >
                <ChevronRightIcon data-icon="inline-start" aria-hidden="true" />
              </Button>
            </div>
          </>
        ) : null}
      </div>

      {hasMultipleImages ? (
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
          {images.map((image, index) => (
            <button
              key={image.id}
              type="button"
              aria-current={index === safeIndex ? "true" : undefined}
              aria-label={`Mostra foto ${index + 1}`}
              className={cn(
                "relative aspect-[4/3] overflow-hidden rounded-md border bg-muted transition-opacity",
                index === safeIndex
                  ? "border-primary ring-2 ring-ring/40"
                  : "border-border opacity-75 hover:opacity-100"
              )}
              data-carousel-thumb
              onClick={() => setCurrentIndex(index)}
            >
              <StorageImage
                src={image.thumbUrl}
                alt=""
                fill
                className="object-cover"
                sizes="96px"
              />
            </button>
          ))}
        </div>
      ) : null}
    </section>
  )
}

export { ListingImageCarousel }
