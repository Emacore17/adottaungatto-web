import Image from "next/image"
import Link from "next/link"
import { ImageIcon, MapPinIcon, Trash2Icon } from "lucide-react"

import { removeFavoriteAction } from "@/app/(account)/account/actions"
import { getPublicObjectUrl } from "@/lib/api/assets"
import type { FavoriteListingItem } from "@/lib/api/account"
import { routes } from "@/lib/routes"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent } from "@workspace/ui/components/card"

type AccountFavoriteCardProps = {
  item: FavoriteListingItem
  returnPath?: string
}

function AccountFavoriteCard({ item, returnPath }: AccountFavoriteCardProps) {
  const listing = item.listing
  const coverUrl = getPublicObjectUrl(
    listing.images.cover?.objectKeyThumb ?? listing.images.cover?.objectKeyLarge
  )
  const location = listing.location
    ? `${listing.location.municipality.name}, ${listing.location.province.name}`
    : "Italia"

  return (
    <Card>
      <CardContent className="grid gap-4 p-4 sm:grid-cols-[8rem_minmax(0,1fr)]">
        <div className="relative aspect-[4/3] overflow-hidden rounded-md bg-muted sm:aspect-square">
          {coverUrl ? (
            <Image
              src={coverUrl}
              alt={listing.title}
              fill
              className="object-cover"
              sizes="8rem"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              <ImageIcon aria-hidden="true" className="size-6" />
            </div>
          )}
        </div>

        <div className="flex min-w-0 flex-col gap-3">
          <div className="grid gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">Preferito</Badge>
              <span className="text-xs text-muted-foreground">
                Salvato {formatDate(item.favoritedAt)}
              </span>
            </div>
            <h2 className="text-lg font-semibold tracking-normal">
              {listing.title}
            </h2>
            <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">
              {listing.description}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground">
              <MapPinIcon aria-hidden="true" className="size-4 shrink-0" />
              <span className="truncate">{location}</span>
            </p>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline" size="sm">
                <Link href={routes.listing(listing.id)}>Apri annuncio</Link>
              </Button>
              {returnPath ? (
                <form action={removeFavoriteAction}>
                  <input type="hidden" name="listingId" value={listing.id} />
                  <input type="hidden" name="nextPath" value={returnPath} />
                  <Button type="submit" variant="destructive" size="sm">
                    <Trash2Icon data-icon="inline-start" aria-hidden="true" />
                    Rimuovi
                  </Button>
                </form>
              ) : null}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("it-IT", {
    dateStyle: "medium",
  }).format(new Date(value))
}

export { AccountFavoriteCard }
