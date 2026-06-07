import Link from "next/link"
import { MapPinIcon } from "lucide-react"

import {
  ListingImagePreview,
  type ListingPreviewImage,
} from "@/app/(public)/_components/listing-image-preview"
import { ListingFavoriteToggle } from "@/app/(public)/_components/listing-favorite-toggle"
import { getPublicObjectUrl } from "@/lib/api/assets"
import type { PublicListingImage, PublicListingSummary } from "@/lib/api/types"
import { formatAgeMonths, formatListingPrice } from "@/lib/listings/format"
import { routes } from "@/lib/routes"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

type ListingCardProps = {
  isAuthenticated: boolean
  isFavorite: boolean
  listing: PublicListingSummary
  nextPath: string
  priority?: boolean
}

function ListingCard({
  isAuthenticated,
  isFavorite,
  listing,
  nextPath,
  priority,
}: ListingCardProps) {
  const previewImages = createPreviewImages(listing)
  const locationLabel = listing.location
    ? `${listing.location.municipality.name}, ${listing.location.province.name}`
    : "Italia"
  const isSponsored = listing.sponsorship.isSponsored

  return (
    <article
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-[28px] bg-card ring-1 ring-brand-border/60 shadow-[0_24px_48px_-36px_rgba(60,30,10,0.45)] transition-[transform,box-shadow,ring-color] hover:-translate-y-1 hover:shadow-[0_44px_80px_-32px_rgba(60,30,10,0.4)] hover:ring-brand-coral/45 md:flex-row",
        isSponsored && "ring-brand-amber/55"
      )}
    >
      <div
        className={cn(
          "relative isolate flex aspect-[5/4] w-full overflow-hidden md:aspect-auto md:w-[44%] md:min-h-[22rem]",
          isSponsored ? "bg-brand-amber-soft/70" : "bg-secondary"
        )}
      >
        <ListingImagePreview
          href={routes.listing(listing.id)}
          images={previewImages}
          title={listing.title}
          priority={priority}
        />

        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-2/3 bg-gradient-to-t from-black/55 via-black/15 to-transparent"
        />

        {isSponsored ? (
          <span className="absolute top-4 left-4 z-10 inline-flex items-center gap-1 rounded-full bg-brand-amber px-3 py-1 text-[10px] font-semibold tracking-[0.2em] text-brand-teal-ink uppercase shadow-[0_4px_14px_-4px_rgba(0,0,0,0.25)]">
            {listing.sponsorship.label ?? "Sponsorizzato"}
          </span>
        ) : null}

        <ListingFavoriteToggle
          className="absolute top-4 right-4 z-10"
          initialFavoriteCount={listing.stats.favoriteCount}
          isAuthenticated={isAuthenticated}
          isFavorite={isFavorite}
          listingId={listing.id}
          nextPath={nextPath}
        />

        <div className="absolute inset-x-5 bottom-5 z-[2] flex items-center gap-2 text-brand-cream">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[10px] font-semibold tracking-[0.22em] text-white uppercase backdrop-blur">
            <MapPinIcon aria-hidden="true" className="size-3" />
            <span className="truncate">{locationLabel}</span>
          </span>
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-5 px-6 py-6 sm:px-8 sm:py-8">
        <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-semibold tracking-[0.22em] text-brand-coral-strong uppercase">
          <span>{formatAgeMonths(listing.ageMonths)}</span>
          <span aria-hidden="true" className="text-brand-border">·</span>
          <span
            className={cn(
              listing.isFree ? "text-brand-olive-strong" : "text-brand-coral-strong"
            )}
          >
            {formatListingPrice(listing)}
          </span>
          {listing.breed ? (
            <>
              <span aria-hidden="true" className="text-brand-border">·</span>
              <span className="text-brand-teal-ink">{listing.breed.name}</span>
            </>
          ) : null}
        </div>

        <h3 className="font-heading text-[1.75rem] leading-[1.05] font-normal tracking-[-0.02em] text-brand-teal-ink sm:text-3xl">
          <Link
            href={routes.listing(listing.id)}
            className="transition-colors group-hover:text-brand-coral-strong"
          >
            {listing.title}
          </Link>
        </h3>

        <p className="line-clamp-3 text-[15px] leading-7 text-muted-foreground sm:text-base sm:leading-[1.8]">
          {listing.description}
        </p>

        <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={cn(
                "rounded-full border-0 px-3 py-1 text-[11px] font-medium",
                listing.isFree
                  ? "bg-brand-olive-soft text-brand-olive-strong"
                  : "bg-brand-coral-soft text-brand-coral-strong"
              )}
            >
              {listing.isFree ? "Adozione gratuita" : "Contributo"}
            </Badge>
          </div>

          <Button
            asChild
            size="sm"
            className="rounded-full bg-brand-teal-ink px-5 text-brand-cream shadow-[0_18px_28px_-20px_rgba(0,0,0,0.35)] hover:bg-brand-coral-strong hover:text-brand-cream"
          >
            <Link href={routes.listing(listing.id)}>
              Apri scheda
              <span
                aria-hidden="true"
                className="ml-1 transition-transform group-hover:translate-x-0.5"
              >
                →
              </span>
            </Link>
          </Button>
        </div>
      </div>
    </article>
  )
}

function createPreviewImages(
  listing: PublicListingSummary
): ListingPreviewImage[] {
  const images =
    listing.images.preview.length > 0
      ? listing.images.preview
      : listing.images.cover
        ? [listing.images.cover]
        : []

  return images
    .map((image, index) => createPreviewImage(listing.title, image, index))
    .filter((image): image is ListingPreviewImage => image !== null)
}

function createPreviewImage(
  title: string,
  image: PublicListingImage,
  index: number
): ListingPreviewImage | null {
  const url = getPublicObjectUrl(image.objectKeyLarge ?? image.objectKeyThumb)

  if (!url) {
    return null
  }

  return {
    alt: `${title} - foto ${index + 1}`,
    id: image.id,
    url,
  }
}

export { ListingCard }
