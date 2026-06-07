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
        "group relative flex flex-col overflow-hidden rounded-xl border border-border bg-background transition-shadow hover:shadow-md",
        isSponsored && "ring-1 ring-accent/30"
      )}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-secondary">
        <ListingImagePreview
          href={detailHref}
          images={previewImages}
          title={listing.title}
          priority={priority}
        />

        {isSponsored ? (
          <span className="absolute top-3 left-3 z-10 inline-flex items-center gap-1 rounded-full bg-background px-2.5 py-1 text-[10px] font-medium tracking-wide text-foreground shadow-sm">
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

      <div className="flex min-w-0 flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="line-clamp-1 text-base font-semibold tracking-tight text-foreground">
            <Link
              href={detailHref}
              className="after:absolute after:inset-0 after:content-['']"
            >
              {listing.title}
            </Link>
          </h3>
          <span className="shrink-0 text-base font-semibold text-foreground">
            {formatListingPrice(listing)}
          </span>
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
    id: image.id,
    url,
  }
}

export { ListingCard }
