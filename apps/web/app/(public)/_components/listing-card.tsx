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
}

function ListingCard({
  isAuthenticated,
  isFavorite,
  listing,
  nextPath,
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
        "gap-0 py-0 transition-[box-shadow,transform] hover:-translate-y-0.5 hover:ring-brand-teal/35",
        isSponsored
          ? "bg-brand-amber-soft/25 shadow-md shadow-brand-amber/10 ring-brand-amber/70"
          : undefined
      )}
    >
      <div className="flex flex-col p-2 sm:grid sm:grid-cols-[minmax(13rem,18rem)_minmax(0,1fr)] sm:gap-1">
        {isSponsored ? (
          <div className="mb-2 h-1.5 rounded-full bg-brand-amber sm:col-span-2" />
        ) : null}

        <div
          className={cn(
            "relative aspect-[4/3] overflow-hidden rounded-lg border sm:aspect-auto sm:min-h-60",
            isSponsored
              ? "border-brand-amber/45 bg-brand-amber-soft/70"
              : "border-border/80 bg-secondary"
          )}
        >
          <ListingImagePreview
            href={routes.listing(listing.id)}
            images={previewImages}
            title={listing.title}
          />
          <ListingFavoriteToggle
            className="absolute top-3 right-3 z-10"
            initialFavoriteCount={listing.stats.favoriteCount}
            isAuthenticated={isAuthenticated}
            isFavorite={isFavorite}
            listingId={listing.id}
            nextPath={nextPath}
          />
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-4 px-2 py-4 sm:px-4">
          <CardHeader>
            <CardTitle>
              <Link
                href={routes.listing(listing.id)}
                className="transition-colors hover:text-brand-teal-strong"
              >
                {listing.title}
              </Link>
            </CardTitle>
            <CardDescription className="flex items-center gap-1">
              <MapPinIcon data-icon="inline-start" aria-hidden="true" />
              <span className="truncate">{locationLabel}</span>
            </CardDescription>
            <CardAction className="flex flex-col items-end gap-2">
              {isSponsored ? (
                <Badge className="bg-brand-amber text-brand-teal-ink">
                  {listing.sponsorship.label ?? "Sponsorizzato"}
                </Badge>
              ) : null}
              <Badge
                variant="outline"
                className="border-brand-teal/20 bg-brand-teal-soft text-brand-teal-ink"
              >
                {formatAgeMonths(listing.ageMonths)}
              </Badge>
              <Badge
                variant="outline"
                className={cn(
                  listing.isFree
                    ? "border-brand-olive/30 bg-brand-olive-soft text-brand-teal-ink"
                    : "border-brand-coral/25 bg-brand-coral-soft text-brand-coral-strong"
                )}
              >
                {formatListingPrice(listing)}
              </Badge>
            </CardAction>
          </CardHeader>
          <CardContent>
            <p className="line-clamp-3 text-sm text-muted-foreground">
              {listing.description}
            </p>
          </CardContent>
          <CardFooter className="mt-auto justify-end gap-3">
            <Button
              asChild
              variant="outline"
              size="sm"
              className="hover:border-brand-coral/35 hover:bg-brand-coral-soft hover:text-brand-coral-strong"
            >
              <Link href={routes.listing(listing.id)}>Apri scheda</Link>
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
    blurDataUrl: image.blurDataUrl,
    id: image.id,
    url,
  }
}

export { ListingCard }
