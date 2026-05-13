import { ListingFavoriteToggle } from "@/app/(public)/_components/listing-favorite-toggle"
import { ListingLikeToggle } from "@/app/(public)/listings/[id]/_components/listing-like-toggle"
import { routes } from "@/lib/routes"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"

type FavoriteStatus = "error" | "removed" | "saved" | "unavailable" | null

type ListingFavoriteCardProps = {
  favoriteStatus: FavoriteStatus
  initialLikeCount: number
  initialLiked: boolean
  isAuthenticated: boolean
  isFavorite: boolean
  listingId: string
}

function ListingFavoriteCard({
  favoriteStatus,
  initialLikeCount,
  initialLiked,
  isAuthenticated,
  isFavorite,
  listingId,
}: ListingFavoriteCardProps) {
  const nextPath = routes.listing(listingId)

  return (
    <Card id="save-favorite" className="ring-brand-coral/15">
      <CardHeader>
        <CardTitle>Azioni annuncio</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <FavoriteFeedback status={favoriteStatus} />
        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium text-muted-foreground">
            Mi piace
          </span>
          <ListingLikeToggle
            initialCount={initialLikeCount}
            initialLiked={initialLiked}
            isAuthenticated={isAuthenticated}
            listingId={listingId}
            nextPath={nextPath}
          />
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium text-muted-foreground">
            Preferito
          </span>
          <ListingFavoriteToggle
            isAuthenticated={isAuthenticated}
            isFavorite={isFavorite}
            listingId={listingId}
            nextPath={nextPath}
            showLabel
          />
        </div>
      </CardContent>
    </Card>
  )
}

function FavoriteFeedback({ status }: { status: FavoriteStatus }) {
  if (!status) {
    return null
  }

  const message =
    status === "saved"
      ? "Annuncio salvato nei preferiti."
      : status === "removed"
        ? "Annuncio rimosso dai preferiti."
        : status === "unavailable"
          ? "Questo annuncio non e' piu disponibile."
          : "Non e' stato possibile aggiornare il preferito. Riprova piu tardi."

  return (
    <p className="rounded-md border border-brand-coral/20 bg-brand-coral-soft px-3 py-2 text-sm text-brand-coral-strong">
      {message}
    </p>
  )
}

export { ListingFavoriteCard, type FavoriteStatus }
