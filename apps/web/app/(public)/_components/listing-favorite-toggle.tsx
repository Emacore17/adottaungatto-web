"use client"

import { useEffect, useState } from "react"
import { useFormStatus } from "react-dom"
import Link from "next/link"
import { HeartIcon } from "lucide-react"

import { toggleFavoriteAction } from "@/app/(public)/listings/actions"
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
  const [visualFavorite, setVisualFavorite] = useState(isFavorite)

  useEffect(() => {
    setVisualFavorite(isFavorite)
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

  const favoriteAction = isFavorite ? "remove" : "add"

  return (
    <form
      action={toggleFavoriteAction}
      className={className}
      data-favorite-toggle
      data-favorite-state={isFavorite ? "saved" : "idle"}
      data-listing-id={listingId}
    >
      <input type="hidden" name="listingId" value={listingId} />
      <input type="hidden" name="favoriteAction" value={favoriteAction} />
      <input type="hidden" name="nextPath" value={nextPath} />
      <FavoriteToggleButton
        showLabel={showLabel}
        visualFavorite={visualFavorite}
        onVisualFavoriteChange={setVisualFavorite}
      />
    </form>
  )
}

function FavoriteToggleButton({
  onVisualFavoriteChange,
  showLabel,
  visualFavorite,
}: {
  onVisualFavoriteChange: (value: boolean) => void
  showLabel: boolean
  visualFavorite: boolean
}) {
  const { pending } = useFormStatus()
  const label = visualFavorite ? "Rimuovi dai preferiti" : "Salva nei preferiti"

  return (
    <Button
      type="submit"
      variant={visualFavorite ? "secondary" : "outline"}
      size={showLabel ? "default" : "icon-sm"}
      aria-label={label}
      aria-pressed={visualFavorite}
      title={label}
      disabled={pending}
      onClick={() => {
        onVisualFavoriteChange(!visualFavorite)
      }}
      className={cn(
        "transition-transform active:scale-95",
        !showLabel && "shadow-sm",
        visualFavorite &&
          "border-brand-coral/30 bg-brand-coral-soft text-brand-coral-strong hover:bg-brand-coral-soft/80",
        !visualFavorite && "bg-background/90"
      )}
    >
      <HeartIcon
        data-icon={showLabel ? "inline-start" : undefined}
        className={cn(
          "transition-[fill,transform] duration-200",
          visualFavorite && "fill-current"
        )}
      />
      {showLabel ? label : null}
    </Button>
  )
}

export { ListingFavoriteToggle }
