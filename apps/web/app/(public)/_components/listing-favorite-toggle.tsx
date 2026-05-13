"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { HeartIcon } from "lucide-react"

import { routes } from "@/lib/routes"
import { Button } from "@workspace/ui/components/button"
import { toast } from "@workspace/ui/components/sonner"
import { cn } from "@workspace/ui/lib/utils"

type ListingFavoriteToggleProps = {
  emphasis?: "default" | "prominent"
  initialFavoriteCount: number
  isAuthenticated: boolean
  isFavorite: boolean
  listingId: string
  nextPath: string
  showLabel?: boolean
  className?: string
}

function ListingFavoriteToggle({
  className,
  emphasis = "default",
  initialFavoriteCount,
  isAuthenticated,
  isFavorite,
  listingId,
  nextPath,
  showLabel = false,
}: ListingFavoriteToggleProps) {
  const [count, setCount] = useState(initialFavoriteCount)
  const [favorite, setFavorite] = useState(isFavorite)
  const [hasError, setHasError] = useState(false)
  const [isPending, setIsPending] = useState(false)
  const isProminent = emphasis === "prominent"

  useEffect(() => {
    setCount(initialFavoriteCount)
    setFavorite(isFavorite)
    setHasError(false)
  }, [initialFavoriteCount, isFavorite])

  if (!isAuthenticated) {
    const label = showLabel ? "Accedi per salvare" : "Accedi per salvare"

    return (
      <Button
        asChild
        variant="ghost"
        size={isProminent || showLabel ? "default" : "sm"}
        className={cn(
          "gap-1.5 text-muted-foreground hover:bg-muted hover:text-foreground",
          !showLabel && "bg-background/90 shadow-sm backdrop-blur",
          isProminent && "h-11 rounded-full px-4 text-base",
          className
        )}
        aria-label={label}
        title={label}
        data-favorite-toggle
        data-favorite-count={count}
        data-favorite-state="idle"
        data-listing-id={listingId}
      >
        <Link href={routes.login(nextPath)}>
          <HeartIcon
            aria-hidden="true"
            data-icon={showLabel ? "inline-start" : undefined}
          />
          <span className="tabular-nums">{count}</span>
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
    const nextCount = Math.max(0, count + (nextFavorite ? 1 : -1))
    const previousFavorite = favorite
    const previousCount = count

    setIsPending(true)
    setFavorite(nextFavorite)
    setCount(nextCount)
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
      setCount((currentCount) => {
        if (data.favorited === nextFavorite) {
          return currentCount
        }

        return Math.max(0, currentCount + (data.favorited ? 1 : -1))
      })
      toast.success(
        data.favorited ? "Aggiunto ai preferiti" : "Rimosso dai preferiti"
      )
    } catch {
      setFavorite(previousFavorite)
      setCount(previousCount)
      setHasError(true)
      toast.error("Non e' stato possibile aggiornare i preferiti.")
    } finally {
      setIsPending(false)
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size={isProminent || showLabel ? "default" : "sm"}
      aria-label={label}
      aria-pressed={favorite}
      title={hasError ? "Non aggiornato. Riprova." : label}
      disabled={isPending}
      data-favorite-toggle
      data-favorite-count={count}
      data-favorite-state={favorite ? "saved" : "idle"}
      data-listing-id={listingId}
      onClick={toggleFavorite}
      className={cn(
        "gap-1.5 text-muted-foreground transition-[background-color,border-color,color] hover:bg-muted hover:text-foreground",
        !showLabel && "bg-background/90 shadow-sm backdrop-blur",
        isProminent && "h-11 rounded-full px-4 text-base",
        favorite && "text-foreground",
        hasError && "border-destructive/40 text-destructive",
        className
      )}
    >
      <HeartIcon
        data-icon={showLabel ? "inline-start" : undefined}
        aria-hidden="true"
        className={cn("transition-colors", favorite && "fill-current")}
      />
      <span className="tabular-nums">{count}</span>
      {showLabel ? <span>{visibleLabel}</span> : null}
    </Button>
  )
}

export { ListingFavoriteToggle }
