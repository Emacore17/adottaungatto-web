import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { CalendarIcon, MapPinIcon } from "lucide-react"

import {
  ListingContactCard,
  type ContactStatus,
} from "@/app/(public)/listings/[id]/_components/listing-contact-card"
import {
  ListingFavoriteCard,
  type FavoriteStatus,
} from "@/app/(public)/listings/[id]/_components/listing-favorite-card"
import {
  ListingImageCarousel,
  type ListingCarouselImage,
} from "@/app/(public)/listings/[id]/_components/listing-image-carousel"
import { JsonLd } from "@/components/shared/json-ld"
import { getPublicObjectUrl } from "@/lib/api/assets"
import type { PublicListingDetail, PublicListingImage } from "@/lib/api/types"
import { listFavoriteListingIds } from "@/lib/api/favorites"
import { getListingLikeState } from "@/lib/api/likes"
import { getPublicListing } from "@/lib/api/listings"
import { getCurrentUserProfile } from "@/lib/api/users"
import { getSessionToken } from "@/lib/auth/session"
import { createListingJsonLd } from "@/lib/seo/json-ld"
import { createPageMetadata } from "@/lib/seo/metadata"
import { Badge } from "@workspace/ui/components/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { Separator } from "@workspace/ui/components/separator"
import { cn } from "@workspace/ui/lib/utils"

type ListingDetailPageProps = {
  params: Promise<{
    id: string
  }>
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export const dynamic = "force-dynamic"

export async function generateMetadata({
  params,
}: ListingDetailPageProps): Promise<Metadata> {
  const { id } = await params
  const listing = await getPublicListing(id)

  if (!listing.ok) {
    return createPageMetadata({
      title: "Annuncio non trovato",
      path: `/listings/${id}`,
      noIndex: true,
    })
  }

  return createPageMetadata({
    title: listing.data.title,
    description: listing.data.description.slice(0, 155),
    path: `/listings/${listing.data.id}`,
    image:
      getPublicObjectUrl(
        listing.data.images.cover?.objectKeyLarge ??
          listing.data.images.cover?.objectKeyThumb
      ) ?? undefined,
  })
}

export default async function ListingDetailPage({
  params,
  searchParams,
}: ListingDetailPageProps) {
  const { id } = await params
  const query = searchParams ? await searchParams : {}
  const listing = await getPublicListing(id)
  const sessionToken = await getSessionToken()

  if (!listing.ok) {
    notFound()
  }

  let favoriteListingIds = new Set<string>()
  let currentUserProfile: Awaited<
    ReturnType<typeof getCurrentUserProfile>
  > | null = null
  let listingLikeCount = listing.data.stats.likeCount
  let isListingLiked = false

  if (sessionToken) {
    const [favoriteIds, profile, likeState] = await Promise.all([
      listFavoriteListingIds(sessionToken, [listing.data.id]),
      getCurrentUserProfile(sessionToken),
      getListingLikeState(sessionToken, listing.data.id),
    ])

    favoriteListingIds = favoriteIds
    currentUserProfile = profile

    if (likeState.ok) {
      listingLikeCount = likeState.data.likeCount
      isListingLiked = likeState.data.liked
    }
  }

  const hasShareablePhone =
    currentUserProfile?.ok === true &&
    Boolean(currentUserProfile.data.phoneE164)

  const carouselImages = createCarouselImages(listing.data)
  const locationLabel = listing.data.location
    ? `${listing.data.location.municipality.name}, ${listing.data.location.province.name}`
    : "Italia"

  return (
    <>
      <JsonLd data={createListingJsonLd(listing.data)} />
      <main className="mx-auto grid w-full max-w-6xl flex-1 gap-6 px-4 pt-28 pb-8 sm:px-6 sm:pt-32 lg:grid-cols-[minmax(0,1fr)_20rem] lg:px-8">
        <article className="flex min-w-0 flex-col gap-6">
          <ListingImageCarousel
            images={carouselImages}
            title={listing.data.title}
          />

          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-2">
              <Badge
                variant="outline"
                className={cn(
                  listing.data.isFree
                    ? "border-brand-olive/30 bg-brand-olive-soft text-brand-teal-ink"
                    : "border-brand-coral/25 bg-brand-coral-soft text-brand-coral-strong"
                )}
              >
                {listing.data.isFree ? "Adozione" : "Contributo"}
              </Badge>
              {listing.data.breed ? (
                <Badge
                  variant="outline"
                  className="border-brand-teal/25 bg-brand-teal-soft text-brand-teal-ink"
                >
                  {listing.data.breed.name}
                </Badge>
              ) : null}
            </div>

            <div className="flex flex-col gap-3">
              <h1 className="text-3xl font-medium text-balance">
                {listing.data.title}
              </h1>
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <MapPinIcon data-icon="inline-start" aria-hidden="true" />
                  {locationLabel}
                </span>
                {listing.data.publishedAt ? (
                  <span className="flex items-center gap-1">
                    <CalendarIcon data-icon="inline-start" aria-hidden="true" />
                    {new Intl.DateTimeFormat("it-IT", {
                      dateStyle: "medium",
                    }).format(new Date(listing.data.publishedAt))}
                  </span>
                ) : null}
              </div>
            </div>

            <Separator />

            <div className="max-w-none text-base leading-8 text-foreground">
              <p>{listing.data.description}</p>
            </div>
          </div>
        </article>

        <aside className="flex flex-col gap-4">
          <Card className="ring-brand-teal/15">
            <CardHeader>
              <CardTitle>Proprietario</CardTitle>
              <CardDescription>
                {listing.data.owner.displayName}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm">
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">Profilo</span>
                <span>{listing.data.owner.profileType}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">Immagini</span>
                <span>{listing.data.images.readyCount}</span>
              </div>
            </CardContent>
          </Card>
          <ListingContactCard
            contactStatus={readContactStatus(query.contact)}
            hasShareablePhone={hasShareablePhone}
            isAuthenticated={Boolean(sessionToken)}
            isEnabled={listing.data.contactRequestsEnabled}
            listingId={listing.data.id}
          />
          <ListingFavoriteCard
            favoriteStatus={readFavoriteStatus(query.favorite)}
            initialLikeCount={listingLikeCount}
            initialLiked={isListingLiked}
            isAuthenticated={Boolean(sessionToken)}
            isFavorite={favoriteListingIds.has(listing.data.id)}
            listingId={listing.data.id}
          />
        </aside>
      </main>
    </>
  )
}

function createCarouselImages(
  listing: PublicListingDetail
): ListingCarouselImage[] {
  const detailImages =
    listing.images.items.length > 0
      ? listing.images.items
      : listing.images.cover
        ? [listing.images.cover]
        : []

  return detailImages
    .map((image, index) => createCarouselImage(listing.title, image, index))
    .filter((image): image is ListingCarouselImage => image !== null)
}

function createCarouselImage(
  title: string,
  image: PublicListingImage,
  index: number
): ListingCarouselImage | null {
  const url = getPublicObjectUrl(image.objectKeyLarge ?? image.objectKeyThumb)
  const thumbUrl = getPublicObjectUrl(
    image.objectKeyThumb ?? image.objectKeyLarge
  )

  if (!url || !thumbUrl) {
    return null
  }

  return {
    alt: `${title} - foto ${index + 1}`,
    id: image.id,
    isCover: image.isCover,
    thumbUrl,
    url,
  }
}

function readContactStatus(
  value: string | string[] | undefined
): ContactStatus {
  const raw = Array.isArray(value) ? value[0] : value

  if (
    raw === "error" ||
    raw === "invalid" ||
    raw === "sent" ||
    raw === "unavailable"
  ) {
    return raw
  }

  return null
}

function readFavoriteStatus(
  value: string | string[] | undefined
): FavoriteStatus {
  const raw = Array.isArray(value) ? value[0] : value

  if (
    raw === "error" ||
    raw === "removed" ||
    raw === "saved" ||
    raw === "unavailable"
  ) {
    return raw
  }

  return null
}
