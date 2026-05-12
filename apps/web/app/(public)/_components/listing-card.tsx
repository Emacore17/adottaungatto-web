import Link from "next/link"
import { HeartIcon, MapPinIcon } from "lucide-react"

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
  listing: PublicListingSummary
}

function ListingCard({ listing }: ListingCardProps) {
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
      className={cn("gap-0 py-0", isSponsored ? "ring-primary/40" : undefined)}
    >
      <div className="flex flex-col sm:flex-row">
        <Link
          href={routes.listing(listing.id)}
          className="relative aspect-[4/3] bg-muted sm:aspect-auto sm:min-h-56 sm:w-64 sm:shrink-0 md:w-72"
        >
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
        <div className="flex min-w-0 flex-1 flex-col gap-4 py-4">
          <CardHeader>
            <CardTitle>
              <Link
                href={routes.listing(listing.id)}
                className="hover:underline"
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
                <Badge>{listing.sponsorship.label ?? "Sponsorizzato"}</Badge>
              ) : null}
              <Badge variant={listing.isFree ? "secondary" : "outline"}>
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
            <Button asChild variant="outline" size="sm">
              <Link href={routes.listing(listing.id)}>Apri scheda</Link>
            </Button>
          </CardFooter>
        </div>
      </div>
    </Card>
  )
}

export { ListingCard }
