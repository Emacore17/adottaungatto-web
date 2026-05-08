import Image from "next/image"
import Link from "next/link"
import { HeartIcon, MapPinIcon } from "lucide-react"

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

  return (
    <Card size="sm" className="h-full">
      <div className="relative aspect-[4/3] bg-muted">
        {coverUrl ? (
          <Image
            src={coverUrl}
            alt={listing.title}
            fill
            className="object-cover"
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center px-4 text-center text-sm text-muted-foreground">
            Foto in preparazione
          </div>
        )}
      </div>
      <CardHeader>
        <CardTitle>
          <Link href={routes.listing(listing.id)} className="hover:underline">
            {listing.title}
          </Link>
        </CardTitle>
        <CardDescription className="flex items-center gap-1">
          <MapPinIcon data-icon="inline-start" aria-hidden="true" />
          <span className="truncate">{locationLabel}</span>
        </CardDescription>
        <CardAction>
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
      <CardFooter className="justify-between gap-3">
        <span className="flex items-center gap-1 text-sm text-muted-foreground">
          <HeartIcon data-icon="inline-start" aria-hidden="true" />
          {listing.stats.likeCount}
        </span>
        <Button asChild variant="outline" size="sm">
          <Link href={routes.listing(listing.id)}>Apri scheda</Link>
        </Button>
      </CardFooter>
    </Card>
  )
}

export { ListingCard }
