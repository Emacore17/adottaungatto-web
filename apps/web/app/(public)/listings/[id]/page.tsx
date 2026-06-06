import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { CalendarIcon, MapPinIcon } from "lucide-react"

import {
  ListingContactCard,
  type ContactStatus,
} from "@/app/(public)/listings/[id]/_components/listing-contact-card"
import { ListingFavoriteToggle } from "@/app/(public)/_components/listing-favorite-toggle"
import {
  ListingImageCarousel,
  type ListingCarouselImage,
} from "@/app/(public)/listings/[id]/_components/listing-image-carousel"
import { JsonLd } from "@/components/shared/json-ld"
import { getPublicObjectUrl } from "@/lib/api/assets"
import type { PublicListingDetail, PublicListingImage } from "@/lib/api/types"
import { listFavoriteListingIds } from "@/lib/api/favorites"
import { getPublicListing } from "@/lib/api/listings"
import { getCurrentUserProfile } from "@/lib/api/users"
import { getSessionToken } from "@/lib/auth/session"
import { formatAgeMonths, formatListingPrice } from "@/lib/listings/format"
import { routes } from "@/lib/routes"
import { createListingJsonLd } from "@/lib/seo/json-ld"
import { createPageMetadata } from "@/lib/seo/metadata"
import { Avatar, AvatarFallback } from "@workspace/ui/components/avatar"
import { Badge } from "@workspace/ui/components/badge"
import { Separator } from "@workspace/ui/components/separator"
import { cn } from "@workspace/ui/lib/utils"

type ListingDetailPageProps = {
  params: Promise<{
    id: string
  }>
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

type ListingTone = "amber" | "coral" | "olive" | "teal"

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

  if (sessionToken) {
    const [favoriteIds, profile] = await Promise.all([
      listFavoriteListingIds(sessionToken, [listing.data.id]),
      getCurrentUserProfile(sessionToken),
    ])

    favoriteListingIds = favoriteIds
    currentUserProfile = profile
  }

  const hasShareablePhone =
    currentUserProfile?.ok === true &&
    Boolean(currentUserProfile.data.phoneE164)

  const carouselImages = createCarouselImages(listing.data)
  const locationLabel = listing.data.location
    ? `${listing.data.location.municipality.name}, ${listing.data.location.province.name}`
    : "Italia"
  const nextPath = routes.listing(listing.data.id)

  return (
    <>
      <JsonLd data={createListingJsonLd(listing.data)} />
      <main className="mx-auto grid w-full max-w-6xl flex-1 gap-10 px-4 pt-28 pb-12 sm:px-6 sm:pt-32 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-12 lg:px-8">
        <article className="flex min-w-0 flex-col gap-10">
          <ListingImageCarousel
            images={carouselImages}
            title={listing.data.title}
          />

          <section className="flex flex-col gap-6">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-semibold tracking-[0.28em] text-brand-coral-strong uppercase">
                {locationLabel}
              </span>
              {listing.data.publishedAt ? (
                <>
                  <span aria-hidden="true" className="text-brand-border">·</span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                    <CalendarIcon aria-hidden="true" className="size-3" />
                    {new Intl.DateTimeFormat("it-IT", {
                      dateStyle: "medium",
                    }).format(new Date(listing.data.publishedAt))}
                  </span>
                </>
              ) : null}
            </div>

            <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
              <div className="flex min-w-0 flex-col gap-4">
                <h1 className="font-heading text-4xl leading-[1.04] font-normal tracking-[-0.02em] text-balance text-brand-teal-ink sm:text-5xl lg:text-[3.5rem]">
                  {listing.data.title}
                </h1>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    variant="outline"
                    className={cn(
                      "rounded-full px-3 py-1 text-[11px] font-medium",
                      listing.data.isFree
                        ? "border-brand-olive/30 bg-brand-olive-soft text-brand-teal-ink"
                        : "border-brand-coral/25 bg-brand-coral-soft text-brand-coral-strong"
                    )}
                  >
                    {formatListingPrice(listing.data)}
                  </Badge>
                  {listing.data.breed ? (
                    <Badge
                      variant="outline"
                      className="rounded-full border-brand-teal/25 bg-brand-teal-soft px-3 py-1 text-[11px] font-medium text-brand-teal-ink"
                    >
                      {listing.data.breed.name}
                    </Badge>
                  ) : null}
                  <Badge
                    variant="outline"
                    className="rounded-full border-brand-amber/25 bg-brand-amber-soft px-3 py-1 text-[11px] font-medium text-brand-teal-ink"
                  >
                    <MapPinIcon
                      data-icon="inline-start"
                      aria-hidden="true"
                    />
                    {locationLabel}
                  </Badge>
                </div>
              </div>
              <ListingFavoriteToggle
                className="self-start"
                emphasis="prominent"
                initialFavoriteCount={listing.data.stats.favoriteCount}
                isAuthenticated={Boolean(sessionToken)}
                isFavorite={favoriteListingIds.has(listing.data.id)}
                listingId={listing.data.id}
                nextPath={nextPath}
                syncOnMount
              />
            </div>

            <ListingOwnerSummary owner={listing.data.owner} />
          </section>

          <Separator className="bg-brand-border/60" />

          <section className="flex flex-col gap-4">
            <h2 className="font-heading text-2xl leading-tight font-normal tracking-[-0.01em] text-brand-teal-ink sm:text-3xl">
              Descrizione
            </h2>
            <div className="max-w-prose text-base leading-8 text-foreground/85 sm:text-[17px] sm:leading-[1.85]">
              <p>{listing.data.description}</p>
            </div>
          </section>

          <Separator className="bg-brand-border/60" />

          <section className="grid gap-8 md:grid-cols-2">
            <div className="flex flex-col gap-4">
              <h2 className="font-heading text-2xl leading-tight font-normal tracking-[-0.01em] text-brand-teal-ink sm:text-3xl">
                Informazioni
              </h2>
              <dl className="grid gap-3 sm:grid-cols-3 md:grid-cols-1 xl:grid-cols-3">
                <ListingFact
                  label="Eta"
                  tone="teal"
                  value={formatAgeMonths(listing.data.ageMonths)}
                />
                <ListingFact
                  label="Sesso"
                  tone="coral"
                  value={formatSex(listing.data.sex)}
                />
                <ListingFact
                  label="Prezzo"
                  tone={listing.data.isFree ? "olive" : "amber"}
                  value={formatListingPrice(listing.data)}
                />
              </dl>
            </div>

            <div className="flex flex-col gap-4">
              <h2 className="font-heading text-2xl leading-tight font-normal tracking-[-0.01em] text-brand-teal-ink sm:text-3xl">
                Salute e cura
              </h2>
              <div className="flex flex-wrap gap-2">
                <HealthBadge
                  label="Vaccinato"
                  tone="olive"
                  value={listing.data.isVaccinated}
                />
                <HealthBadge
                  label="Sterilizzato"
                  tone="teal"
                  value={listing.data.isSterilized}
                />
                <HealthBadge
                  label="Sverminato"
                  tone="amber"
                  value={listing.data.isDewormed}
                />
                <HealthBadge
                  label="Microchip"
                  tone="coral"
                  value={listing.data.hasMicrochip}
                />
              </div>
            </div>
          </section>
        </article>

        <aside className="flex flex-col gap-4 lg:sticky lg:top-32 lg:self-start">
          <ListingContactCard
            contactStatus={readContactStatus(query.contact)}
            hasShareablePhone={hasShareablePhone}
            isAuthenticated={Boolean(sessionToken)}
            isEnabled={listing.data.contactRequestsEnabled}
            listingId={listing.data.id}
            publicPhoneE164={listing.data.publicPhoneE164}
          />
        </aside>
      </main>
    </>
  )
}

function ListingFact({
  className,
  label,
  tone,
  value,
}: {
  className?: string
  label: string
  tone: ListingTone
  value: string
}) {
  return (
    <div
      className={cn(
        "flex min-h-28 flex-col justify-between gap-3 rounded-2xl border p-4",
        getToneSurfaceClassName(tone),
        className
      )}
    >
      <dt className="text-[10px] font-semibold tracking-[0.22em] uppercase opacity-70">
        {label}
      </dt>
      <dd className="font-heading text-xl leading-tight font-normal tracking-[-0.01em]">
        {value}
      </dd>
    </div>
  )
}

function HealthBadge({
  label,
  tone,
  value,
}: {
  label: string
  tone: ListingTone
  value: boolean | null
}) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "h-auto rounded-full px-3.5 py-1.5 text-[11px] font-medium",
        value === true && getToneSurfaceClassName(tone),
        value === false &&
          "border-brand-coral/20 bg-brand-coral-soft text-brand-coral-strong",
        value === null &&
          "border-brand-amber/25 bg-brand-amber-soft text-brand-teal-ink"
      )}
    >
      {formatHealthLabel(label, value)}
    </Badge>
  )
}

function ListingOwnerSummary({
  owner,
}: {
  owner: PublicListingDetail["owner"]
}) {
  return (
    <div className="flex min-w-0 items-center gap-4 rounded-2xl border border-brand-teal/15 bg-card px-4 py-3 shadow-[0_12px_30px_-22px_rgba(60,30,10,0.45)]">
      <Avatar size="lg" className="bg-brand-teal-soft">
        <AvatarFallback className="bg-brand-teal-soft text-brand-teal-ink">
          {getOwnerInitials(owner.displayName)}
        </AvatarFallback>
      </Avatar>
      <div className="flex min-w-0 flex-col gap-1">
        <p className="text-[10px] font-semibold tracking-[0.22em] text-muted-foreground uppercase">
          Pubblicato da
        </p>
        <p className="font-heading truncate text-lg leading-tight font-normal tracking-[-0.01em] text-brand-teal-ink">
          {owner.displayName}
        </p>
        <span className="text-xs font-medium text-brand-coral-strong">
          {formatOwnerProfileType(owner.profileType)}
        </span>
      </div>
    </div>
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

function formatOwnerProfileType(profileType: string) {
  switch (profileType) {
    case "association":
      return "Associazione"
    case "breeder":
      return "Allevatore"
    case "private":
      return "Privato"
    case "professional":
      return "Professionista"
    case "shelter":
      return "Gattile"
    default:
      return "Profilo verificato"
  }
}

function formatSex(sex: PublicListingDetail["sex"]) {
  switch (sex) {
    case "female":
      return "Femmina"
    case "male":
      return "Maschio"
    default:
      return "Non indicato"
  }
}

function formatHealthLabel(label: string, value: boolean | null) {
  if (value === true) {
    return label
  }

  if (value === false) {
    return `${label}: no`
  }

  return `${label}: non indicato`
}

function getToneSurfaceClassName(tone: ListingTone) {
  switch (tone) {
    case "amber":
      return "border-brand-amber/25 bg-brand-amber-soft text-brand-teal-ink"
    case "coral":
      return "border-brand-coral/25 bg-brand-coral-soft text-brand-coral-strong"
    case "olive":
      return "border-brand-olive/30 bg-brand-olive-soft text-brand-teal-ink"
    case "teal":
      return "border-brand-teal/20 bg-brand-teal-soft text-brand-teal-ink"
  }
}

function getOwnerInitials(displayName: string) {
  const initials = displayName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase()

  return initials || "AG"
}
