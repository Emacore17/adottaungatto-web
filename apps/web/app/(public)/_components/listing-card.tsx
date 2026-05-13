import Link from "next/link"
import { HeartIcon, MapPinIcon } from "lucide-react"

import { ListingFavoriteToggle } from "@/app/(public)/_components/listing-favorite-toggle"
import { StorageImage } from "@/components/shared/storage-image"
import { getPublicObjectUrl } from "@/lib/api/assets"
import type { PublicListingSummary } from "@/lib/api/types"
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
  const coverUrl = getPublicObjectUrl(
    listing.images.cover?.objectKeyLarge ?? listing.images.cover?.objectKeyThumb
  )
  const locationLabel = listing.location
    ? `${listing.location.municipality.name}, ${listing.location.province.name}`
    : "Italia"
  const isSponsored = listing.sponsorship.isSponsored

  return (
    <Card
      size="sm"
      className={cn(
        "gap-0 py-0 hover:ring-brand-teal/35",
        isSponsored ? "ring-brand-amber/50" : undefined
      )}
    >
      <div className="flex flex-col sm:flex-row">
        <div className="relative aspect-[4/3] bg-secondary sm:aspect-auto sm:min-h-56 sm:w-64 sm:shrink-0 md:w-72">
          <Link href={routes.listing(listing.id)} className="block size-full">
            {coverUrl ? (
              <StorageImage
                src={coverUrl}
                alt={listing.title}
                fill
                className="object-cover"
                sizes="(min-width: 768px) 18rem, (min-width: 640px) 16rem, 100vw"
              />
            ) : (
              <div className="flex h-full items-center justify-center px-4 text-center text-sm text-muted-foreground">
                Foto in preparazione
              </div>
            )}
          </Link>
          <ListingFavoriteToggle
            className="absolute top-3 right-3"
            isAuthenticated={isAuthenticated}
            isFavorite={isFavorite}
            listingId={listing.id}
            nextPath={nextPath}
          />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-4 py-4">
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
                <Badge className="bg-brand-amber-soft text-brand-teal-ink">
                  {listing.sponsorship.label ?? "Sponsorizzato"}
                </Badge>
              ) : null}
              <Badge
                variant="outline"
                className={cn(
                  listing.isFree
                    ? "border-brand-olive/30 bg-brand-olive-soft text-brand-teal-ink"
                    : "border-brand-coral/25 bg-brand-coral-soft text-brand-coral-strong"
                )}
              >
                {listing.isFree ? "Adozione" : "Contributo"}
              </Badge>
            </CardAction>
          </CardHeader>
          <CardContent>
            <p className="line-clamp-3 text-sm text-muted-foreground">
              {listing.description}
            </p>
          </CardContent>
          <CardFooter className="mt-auto justify-between gap-3">
            <span className="flex items-center gap-1 text-sm text-muted-foreground">
              <HeartIcon data-icon="inline-start" aria-hidden="true" />
              {listing.stats.likeCount}
            </span>
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

export { ListingCard }
