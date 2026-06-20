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
  const detailHref = routes.listing(listing.id)

  return (
    <article
      className={cn(
        "card-lift group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card hover:border-foreground/15 hover:shadow-xl hover:shadow-foreground/10"
      )}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-secondary">
        <ListingImagePreview
          href={detailHref}
          images={previewImages}
          title={listing.title}
          priority={priority}
        />

        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 z-[5] h-20 bg-gradient-to-b from-black/25 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        />

        {isSponsored ? (
          <span className="absolute top-3 left-3 z-10 inline-flex items-center rounded-full bg-brand-amber-soft px-2.5 py-1 text-[11px] font-bold text-brand-amber-ink shadow-sm">
            Sponsorizzato
          </span>
        ) : null}

        <ListingFavoriteToggle
          className="absolute top-3 right-3 z-10"
          initialFavoriteCount={listing.stats.favoriteCount}
          isAuthenticated={isAuthenticated}
          isFavorite={isFavorite}
          listingId={listing.id}
          nextPath={nextPath}
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1.5 p-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="line-clamp-1 text-base font-bold tracking-tight text-foreground transition-colors group-hover:text-primary">
            <Link
              href={detailHref}
              className="after:absolute after:inset-0 after:content-['']"
            >
              {listing.title}
            </Link>
          </h3>
          {listing.isFree ? (
            <span className="shrink-0 rounded-full bg-brand-olive-soft px-2.5 py-1 text-xs font-bold text-brand-olive">
              Gratis
            </span>
          ) : (
            <span className="shrink-0 text-[15px] font-bold tabular-nums text-foreground">
              {formatListingPrice(listing)}
            </span>
          )}
        </div>

        <p className="flex items-center gap-1 text-sm text-muted-foreground">
          <MapPinIcon
            aria-hidden="true"
            className="size-3.5 shrink-0 text-muted-foreground"
          />
          <span className="truncate">{locationLabel}</span>
        </p>

        <p className="text-sm text-muted-foreground">
          {formatAgeMonths(listing.ageMonths)}
          {listing.breed ? ` · ${listing.breed.name}` : ""}
        </p>
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
    blurDataUrl: image.blurDataUrl,
    id: image.id,
    url,
  }
}

export { ListingCard }
