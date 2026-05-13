"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ThumbsUpIcon } from "lucide-react"

import { routes } from "@/lib/routes"
import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

type ListingLikeToggleProps = {
  initialCount: number
  initialLiked: boolean
  isAuthenticated: boolean
  listingId: string
  nextPath: string
}

function ListingLikeToggle({
  initialCount,
  initialLiked,
  isAuthenticated,
  listingId,
  nextPath,
}: ListingLikeToggleProps) {
  const [count, setCount] = useState(initialCount)
  const [liked, setLiked] = useState(initialLiked)
  const [isPending, setIsPending] = useState(false)

  useEffect(() => {
    setCount(initialCount)
    setLiked(initialLiked)
  }, [initialCount, initialLiked])

  if (!isAuthenticated) {
    return (
      <Button
        asChild
        variant="outline"
        size="sm"
        data-like-toggle
        data-like-state="signed-out"
        data-like-count={count}
      >
        <Link href={routes.login(nextPath)}>
          <ThumbsUpIcon data-icon="inline-start" aria-hidden="true" />
          {formatLikeLabel(count)}
        </Link>
      </Button>
    )
  }

  async function toggleLike() {
    if (isPending) {
      return
    }

    const nextLiked = !liked
    const nextCount = Math.max(0, count + (nextLiked ? 1 : -1))

    setIsPending(true)
    setLiked(nextLiked)
    setCount(nextCount)

    try {
      const response = await fetch(`/api/likes/listings/${listingId}`, {
        method: nextLiked ? "POST" : "DELETE",
      })

      if (!response.ok) {
        throw new Error("Like request failed.")
      }

      const data = (await response.json()) as {
        liked: boolean
        likeCount: number
      }

      setLiked(data.liked)
      setCount(data.likeCount)
    } catch {
      setLiked(liked)
      setCount(count)
    } finally {
      setIsPending(false)
    }
  }

  const label = liked ? "Ti piace" : "Mi piace"

  return (
    <Button
      type="button"
      variant={liked ? "secondary" : "outline"}
      size="sm"
      aria-label={liked ? "Togli mi piace" : "Metti mi piace"}
      aria-pressed={liked}
      disabled={isPending}
      data-like-toggle
      data-like-state={liked ? "liked" : "idle"}
      data-like-count={count}
      onClick={toggleLike}
      className={cn(
        "min-w-0 transition-[background-color,border-color,color]",
        liked &&
          "border-brand-teal/25 bg-brand-teal-soft text-brand-teal-ink hover:bg-brand-teal-soft/80"
      )}
    >
      <ThumbsUpIcon
        data-icon="inline-start"
        aria-hidden="true"
        className={cn("transition-colors", liked && "fill-current")}
      />
      {label} ({count})
    </Button>
  )
}

function formatLikeLabel(count: number) {
  return count === 1 ? "1 mi piace" : `${count} mi piace`
}

export { ListingLikeToggle }
