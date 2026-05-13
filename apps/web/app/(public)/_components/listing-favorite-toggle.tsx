"use client"

import { useEffect, useRef, useState } from "react"
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
  syncOnMount?: boolean
  className?: string
}

type FavoriteStateResponse = {
  favoriteCount?: number
  favorited: boolean
}

type FavoriteState = {
  favoriteCount: number
  favorited: boolean
  listingId: string
}

const favoriteStateEventName = "adottaungatto:listing-favorite"
const favoriteStateCache = new Map<string, FavoriteState>()

function ListingFavoriteToggle({
  className,
  emphasis = "default",
  initialFavoriteCount,
  isAuthenticated,
  isFavorite,
  listingId,
  nextPath,
  showLabel = false,
  syncOnMount = false,
}: ListingFavoriteToggleProps) {
  const [count, setCount] = useState(initialFavoriteCount)
  const [favorite, setFavorite] = useState(isFavorite)
  const [hasError, setHasError] = useState(false)
  const [isPending, setIsPending] = useState(false)
  const syncGenerationRef = useRef(0)
  const isProminent = emphasis === "prominent"

  useEffect(() => {
    const cachedState = favoriteStateCache.get(listingId)

    if (cachedState) {
      setCount(cachedState.favoriteCount)
      setFavorite(cachedState.favorited)
    } else {
      setCount(initialFavoriteCount)
      setFavorite(isFavorite)
    }

    setHasError(false)
  }, [initialFavoriteCount, isFavorite, listingId])

  useEffect(() => {
    function updateFromFavoriteEvent(event: Event) {
      const state = (event as CustomEvent<FavoriteState>).detail

      if (state?.listingId !== listingId) {
        return
      }

      setCount(state.favoriteCount)
      setFavorite(state.favorited)
      setHasError(false)
    }

    window.addEventListener(favoriteStateEventName, updateFromFavoriteEvent)

    return () => {
      window.removeEventListener(
        favoriteStateEventName,
        updateFromFavoriteEvent
      )
    }
  }, [listingId])

  useEffect(() => {
    if (!isAuthenticated || !syncOnMount) {
      return
    }

    let cancelled = false
    const syncGeneration = ++syncGenerationRef.current

    async function syncFavoriteState() {
      try {
        const response = await fetch(`/api/favorites/listings/${listingId}`, {
          cache: "no-store",
          credentials: "same-origin",
        })

        if (!response.ok) {
          return
        }

        const data = (await response.json()) as FavoriteStateResponse

        if (cancelled || syncGenerationRef.current !== syncGeneration) {
          return
        }

        publishFavoriteState({
          favoriteCount:
            typeof data.favoriteCount === "number"
              ? data.favoriteCount
              : initialFavoriteCount,
          favorited: data.favorited,
          listingId,
        })
        setHasError(false)
      } catch {
        // The server-rendered state remains usable if this client sync fails.
      }
    }

    void syncFavoriteState()

    return () => {
      cancelled = true
    }
  }, [initialFavoriteCount, isAuthenticated, listingId, syncOnMount])

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

    syncGenerationRef.current += 1

    const nextFavorite = !favorite
    const nextCount = Math.max(0, count + (nextFavorite ? 1 : -1))
    const previousFavorite = favorite
    const previousCount = count
    const optimisticState = {
      favoriteCount: nextCount,
      favorited: nextFavorite,
      listingId,
    }

    setIsPending(true)
    publishFavoriteState(optimisticState)
    setHasError(false)

    try {
      const response = await fetch(`/api/favorites/listings/${listingId}`, {
        credentials: "same-origin",
        method: nextFavorite ? "POST" : "DELETE",
      })

      if (!response.ok) {
        throw new Error("Favorite request failed.")
      }

      const data = (await response.json()) as FavoriteStateResponse
      const serverState = {
        favoriteCount:
          typeof data.favoriteCount === "number"
            ? data.favoriteCount
            : nextCount,
        favorited: data.favorited,
        listingId,
      }

      publishFavoriteState(serverState)
      if (data.favorited) {
        toast.success("Aggiunto ai preferiti")
      } else {
        toast.error("Rimosso dai preferiti")
      }
    } catch {
      publishFavoriteState({
        favoriteCount: previousCount,
        favorited: previousFavorite,
        listingId,
      })
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

function publishFavoriteState(state: FavoriteState) {
  favoriteStateCache.set(state.listingId, state)
  window.dispatchEvent(
    new CustomEvent(favoriteStateEventName, { detail: state })
  )
}

export { ListingFavoriteToggle }
