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
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
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
    <Card
      size="sm"
      className={cn(
        "group relative gap-0 overflow-hidden rounded-3xl border-0 p-0 shadow-[0_18px_44px_-32px_rgba(60,30,10,0.55)] ring-1 ring-brand-border/70 transition-[transform,box-shadow,ring-color] hover:-translate-y-1 hover:shadow-[0_36px_70px_-32px_rgba(60,30,10,0.55)] hover:ring-brand-coral/45",
        isSponsored
          ? "bg-gradient-to-br from-brand-amber-soft/70 via-card to-card ring-brand-amber/55"
          : "bg-card"
      )}
    >
      <div className="flex flex-col sm:grid sm:grid-cols-[minmax(15rem,20rem)_minmax(0,1fr)]">
        <div
          className={cn(
            "relative aspect-[4/3] overflow-hidden sm:aspect-auto sm:min-h-72",
            isSponsored ? "bg-brand-amber-soft/70" : "bg-secondary"
          )}
        >
          <ListingImagePreview
            href={routes.listing(listing.id)}
            images={previewImages}
            title={listing.title}
            priority={priority}
          />
          {isSponsored ? (
            <span className="absolute top-3 left-3 z-10 inline-flex items-center gap-1 rounded-full bg-brand-amber px-3 py-1 text-[10px] font-semibold tracking-[0.18em] text-brand-teal-ink uppercase shadow-sm">
              {listing.sponsorship.label ?? "Sponsorizzato"}
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

        <div className="flex min-w-0 flex-1 flex-col gap-5 px-5 py-6 sm:px-7 sm:py-7">
          <CardHeader className="p-0">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.22em] text-brand-coral-strong uppercase">
              <MapPinIcon
                data-icon="inline-start"
                aria-hidden="true"
                className="size-3.5"
              />
              <span className="truncate">{locationLabel}</span>
            </p>
            <CardTitle className="font-heading text-2xl leading-[1.1] font-normal tracking-[-0.015em] text-brand-teal-ink sm:text-[1.65rem]">
              <Link
                href={routes.listing(listing.id)}
                className="transition-colors group-hover:text-brand-coral-strong"
              >
                {listing.title}
              </Link>
            </CardTitle>
            <CardDescription className="sr-only">
              {locationLabel}
            </CardDescription>
            <CardAction className="hidden" />
          </CardHeader>

          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className="rounded-full border-brand-teal/25 bg-brand-teal-soft px-3 py-1 text-[11px] font-medium text-brand-teal-ink"
            >
              {formatAgeMonths(listing.ageMonths)}
            </Badge>
            <Badge
              variant="outline"
              className={cn(
                "rounded-full px-3 py-1 text-[11px] font-medium",
                listing.isFree
                  ? "border-brand-olive/30 bg-brand-olive-soft text-brand-teal-ink"
                  : "border-brand-coral/25 bg-brand-coral-soft text-brand-coral-strong"
              )}
            >
              {formatListingPrice(listing)}
            </Badge>
          </div>

          <CardContent className="p-0">
            <p className="line-clamp-3 text-sm leading-6 text-muted-foreground sm:text-[15px] sm:leading-7">
              {listing.description}
            </p>
          </CardContent>

          <CardFooter className="mt-auto justify-end gap-3 p-0">
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="font-medium text-brand-coral-strong hover:bg-brand-coral-soft hover:text-brand-coral-strong"
            >
              <Link href={routes.listing(listing.id)}>
                Apri scheda
                <span aria-hidden="true" className="ml-0.5 transition-transform group-hover:translate-x-0.5">→</span>
              </Link>
            </Button>
          </CardFooter>
        </div>
      </div>
    </Card>
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
