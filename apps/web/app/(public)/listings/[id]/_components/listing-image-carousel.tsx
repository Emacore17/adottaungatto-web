"use client"

import { useState } from "react"
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ImageIcon,
  XIcon,
} from "lucide-react"

import { StorageImage } from "@/components/shared/storage-image"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog"
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
      <Dialog>
        <div className="relative aspect-[16/10] overflow-hidden rounded-lg border border-border/80 bg-muted">
          <DialogTrigger asChild>
            <button
              type="button"
              aria-label={`Ingrandisci foto ${safeIndex + 1} di ${images.length}`}
              className="absolute inset-0 block size-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              data-carousel-image-trigger
            >
              <StorageImage
                key={currentImage.id}
                src={currentImage.url}
                alt={currentImage.alt}
                fill
                priority={safeIndex === 0}
                className="object-cover"
                sizes="(min-width: 1024px) 768px, 100vw"
              />
            </button>
          </DialogTrigger>

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
                  <ChevronLeftIcon
                    data-icon="inline-start"
                    aria-hidden="true"
                  />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label="Foto successiva"
                  onClick={showNextImage}
                  className="bg-background/90"
                >
                  <ChevronRightIcon
                    data-icon="inline-start"
                    aria-hidden="true"
                  />
                </Button>
              </div>
            </>
          ) : null}
        </div>

        <DialogContent
          showCloseButton={false}
          className="h-dvh max-h-dvh w-screen max-w-none rounded-none bg-black p-0 text-white ring-0 sm:max-w-none"
          data-listing-image-lightbox
        >
          <DialogTitle className="sr-only">
            Foto annuncio {title}
          </DialogTitle>
          <div className="relative h-dvh w-screen">
            <StorageImage
              key={`fullscreen-${currentImage.id}`}
              src={currentImage.url}
              alt={currentImage.alt}
              fill
              className="object-contain"
              sizes="100vw"
            />

            <DialogClose asChild>
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="Chiudi foto"
                className="absolute top-4 right-4 bg-background/90 text-foreground"
              >
                <XIcon data-icon="inline-start" aria-hidden="true" />
              </Button>
            </DialogClose>

            {hasMultipleImages ? (
              <>
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-md bg-background/90 px-3 py-1 text-sm font-medium text-foreground shadow-xs">
                  {safeIndex + 1}/{images.length}
                </div>
                <div className="absolute inset-x-4 top-1/2 flex -translate-y-1/2 justify-between gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label="Foto precedente"
                    onClick={showPreviousImage}
                    className="bg-background/90 text-foreground"
                  >
                    <ChevronLeftIcon
                      data-icon="inline-start"
                      aria-hidden="true"
                    />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label="Foto successiva"
                    onClick={showNextImage}
                    className="bg-background/90 text-foreground"
                  >
                    <ChevronRightIcon
                      data-icon="inline-start"
                      aria-hidden="true"
                    />
                  </Button>
                </div>
              </>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

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
