import { ListingFavoriteToggle } from "@/app/(public)/_components/listing-favorite-toggle"
import { routes } from "@/lib/routes"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"

type FavoriteStatus = "error" | "removed" | "saved" | "unavailable" | null

type ListingFavoriteCardProps = {
  favoriteStatus: FavoriteStatus
  isAuthenticated: boolean
  isFavorite: boolean
  listingId: string
}

function ListingFavoriteCard({
  favoriteStatus,
  isAuthenticated,
  isFavorite,
  listingId,
}: ListingFavoriteCardProps) {
  const nextPath = `${routes.listing(listingId)}#save-favorite`

  return (
    <Card id="save-favorite">
      <CardHeader>
        <CardTitle>Preferiti</CardTitle>
        <CardDescription>
          Salva questo annuncio nel tuo account per ritrovarlo rapidamente.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <FavoriteFeedback status={favoriteStatus} />
        <ListingFavoriteToggle
          isAuthenticated={isAuthenticated}
          isFavorite={isFavorite}
          listingId={listingId}
          nextPath={nextPath}
          showLabel
        />
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
    <p className="rounded-md border bg-muted px-3 py-2 text-sm text-muted-foreground">
      {message}
    </p>
  )
}

export { ListingFavoriteCard, type FavoriteStatus }
