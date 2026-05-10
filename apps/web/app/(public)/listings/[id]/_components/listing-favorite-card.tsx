import Link from "next/link"
import { HeartIcon, LogInIcon } from "lucide-react"

import { saveFavoriteAction } from "@/app/(public)/listings/actions"
import { routes } from "@/lib/routes"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"

type FavoriteStatus = "error" | "saved" | "unavailable" | null

type ListingFavoriteCardProps = {
  favoriteStatus: FavoriteStatus
  isAuthenticated: boolean
  listingId: string
}

function ListingFavoriteCard({
  favoriteStatus,
  isAuthenticated,
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
        {isAuthenticated ? (
          <form action={saveFavoriteAction}>
            <input type="hidden" name="listingId" value={listingId} />
            <input type="hidden" name="nextPath" value={nextPath} />
            <Button type="submit" variant="outline">
              <HeartIcon data-icon="inline-start" aria-hidden="true" />
              Salva nei preferiti
            </Button>
          </form>
        ) : (
          <Button asChild variant="outline" className="w-fit">
            <Link href={routes.login(nextPath)}>
              <LogInIcon data-icon="inline-start" aria-hidden="true" />
              Accedi per salvare
            </Link>
          </Button>
        )}
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
      : status === "unavailable"
        ? "Questo annuncio non e' piu disponibile."
        : "Non e' stato possibile salvare il preferito. Riprova piu tardi."

  return (
    <p className="rounded-md border bg-muted px-3 py-2 text-sm text-muted-foreground">
      {message}
    </p>
  )
}

export { ListingFavoriteCard, type FavoriteStatus }
