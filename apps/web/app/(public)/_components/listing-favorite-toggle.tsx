"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { HeartIcon } from "lucide-react"

import { routes } from "@/lib/routes"
import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

type ListingFavoriteToggleProps = {
  isAuthenticated: boolean
  isFavorite: boolean
  listingId: string
  nextPath: string
  showLabel?: boolean
  className?: string
}

function ListingFavoriteToggle({
  className,
  isAuthenticated,
  isFavorite,
  listingId,
  nextPath,
  showLabel = false,
}: ListingFavoriteToggleProps) {
  const [favorite, setFavorite] = useState(isFavorite)
  const [hasError, setHasError] = useState(false)
  const [isPending, setIsPending] = useState(false)

  useEffect(() => {
    setFavorite(isFavorite)
    setHasError(false)
  }, [isFavorite])

  if (!isAuthenticated) {
    const label = showLabel ? "Accedi per salvare" : "Accedi per salvare"

    return (
      <Button
        asChild
        variant="outline"
        size={showLabel ? "default" : "icon-sm"}
        className={className}
        aria-label={label}
        title={label}
        data-favorite-toggle
        data-favorite-state="idle"
        data-listing-id={listingId}
      >
        <Link href={routes.login(nextPath)}>
          <HeartIcon data-icon={showLabel ? "inline-start" : undefined} />
          {showLabel ? label : null}
        </Link>
      </Button>
    )
  }

  const label = favorite ? "Rimuovi dai preferiti" : "Salva nei preferiti"
  const visibleLabel = favorite ? "Preferito" : "Salva preferito"

  async function toggleFavorite() {
    if (isPending) {
      return
    }

    const nextFavorite = !favorite
    const previousFavorite = favorite

    setIsPending(true)
    setFavorite(nextFavorite)
    setHasError(false)

    try {
      const response = await fetch(`/api/favorites/listings/${listingId}`, {
        method: nextFavorite ? "POST" : "DELETE",
      })

      if (!response.ok) {
        throw new Error("Favorite request failed.")
      }

      const data = (await response.json()) as { favorited: boolean }

      setFavorite(data.favorited)
    } catch {
      setFavorite(previousFavorite)
      setHasError(true)
    } finally {
      setIsPending(false)
    }
  }

  return (
    <Button
      type="button"
      variant={favorite ? "secondary" : "outline"}
      size={showLabel ? "default" : "icon-sm"}
      aria-label={label}
      aria-pressed={favorite}
      title={hasError ? "Non aggiornato. Riprova." : label}
      disabled={isPending}
      data-favorite-toggle
      data-favorite-state={favorite ? "saved" : "idle"}
      data-listing-id={listingId}
      onClick={toggleFavorite}
      className={cn(
        className,
        "transition-[background-color,border-color,color]",
        !showLabel && "shadow-sm",
        favorite &&
          "border-brand-coral/30 bg-brand-coral-soft text-brand-coral-strong hover:bg-brand-coral-soft/80",
        !favorite && "bg-background/90",
        hasError && "border-destructive/40 text-destructive"
      )}
    >
      <HeartIcon
        data-icon={showLabel ? "inline-start" : undefined}
        className={cn("transition-colors", favorite && "fill-current")}
      />
      {showLabel ? visibleLabel : null}
    </Button>
  )
}

export { ListingFavoriteToggle }
