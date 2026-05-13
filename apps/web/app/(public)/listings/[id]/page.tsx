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
      <main className="mx-auto grid w-full max-w-6xl flex-1 gap-6 px-4 pt-28 pb-8 sm:px-6 sm:pt-32 lg:grid-cols-[minmax(0,1fr)_20rem] lg:px-8">
        <article className="flex min-w-0 flex-col gap-7">
          <ListingImageCarousel
            images={carouselImages}
            title={listing.data.title}
          />

          <section className="flex flex-col gap-5">
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

            <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
              <div className="flex min-w-0 flex-col gap-3">
                <h1 className="text-3xl font-medium text-balance sm:text-4xl">
                  {listing.data.title}
                </h1>
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <Badge
                    variant="outline"
                    className="h-auto border-brand-teal/20 bg-brand-teal-soft px-3 py-1 text-brand-teal-ink"
                  >
                    <MapPinIcon data-icon="inline-start" aria-hidden="true" />
                    {locationLabel}
                  </Badge>
                  {listing.data.publishedAt ? (
                    <Badge
                      variant="outline"
                      className="h-auto border-brand-amber/25 bg-brand-amber-soft px-3 py-1 text-brand-teal-ink"
                    >
                      <CalendarIcon
                        data-icon="inline-start"
                        aria-hidden="true"
                      />
                      {new Intl.DateTimeFormat("it-IT", {
                        dateStyle: "medium",
                      }).format(new Date(listing.data.publishedAt))}
                    </Badge>
                  ) : null}
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

          <Separator />

          <section className="flex flex-col gap-3">
            <h2 className="text-lg font-medium">Descrizione</h2>
            <div className="max-w-none text-base leading-8 text-foreground">
              <p>{listing.data.description}</p>
            </div>
          </section>

          <Separator />

          <section className="grid gap-6 md:grid-cols-2">
            <div className="flex flex-col gap-3">
              <h2 className="text-lg font-medium">Informazioni</h2>
              <dl className="grid gap-3 sm:grid-cols-3 md:grid-cols-1 xl:grid-cols-3">
                <ListingFact
                  label="Eta"
                  tone="teal"
                  value={formatAgeRange(listing.data)}
                />
                <ListingFact
                  label="Sesso"
                  tone="coral"
                  value={formatSex(listing.data.sex)}
                />
                <ListingFact
                  label="Adozione"
                  tone={listing.data.isFree ? "olive" : "amber"}
                  value={formatContribution(listing.data)}
                />
              </dl>
            </div>

            <div className="flex flex-col gap-3">
              <h2 className="text-lg font-medium">Salute e cura</h2>
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

        <aside className="flex flex-col gap-4 lg:sticky lg:top-28 lg:self-start">
          <ListingContactCard
            contactStatus={readContactStatus(query.contact)}
            hasShareablePhone={hasShareablePhone}
            isAuthenticated={Boolean(sessionToken)}
            isEnabled={listing.data.contactRequestsEnabled}
            listingId={listing.data.id}
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
        "flex min-h-24 flex-col justify-between gap-3 rounded-lg border p-3",
        getToneSurfaceClassName(tone),
        className
      )}
    >
      <dt className="text-xs font-medium opacity-75">{label}</dt>
      <dd className="text-sm font-medium">{value}</dd>
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
        "h-auto px-3 py-1.5",
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
    <div className="flex min-w-0 items-center gap-3 rounded-lg border border-brand-teal/15 bg-card p-3 shadow-xs">
      <Avatar size="lg" className="bg-brand-teal-soft">
        <AvatarFallback className="bg-brand-teal-soft text-brand-teal-ink">
          {getOwnerInitials(owner.displayName)}
        </AvatarFallback>
      </Avatar>
      <div className="flex min-w-0 flex-col gap-1">
        <p className="truncate text-sm font-medium text-foreground">
          {owner.displayName}
        </p>
        <Badge
          variant="outline"
          className="h-auto w-fit border-brand-teal/20 bg-brand-teal-soft px-2.5 py-0.5 text-brand-teal-ink"
        >
          {formatOwnerProfileType(owner.profileType)}
        </Badge>
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

function formatAgeRange(listing: PublicListingDetail) {
  if (listing.ageMonthsMin === null && listing.ageMonthsMax === null) {
    return "Eta non indicata"
  }

  if (
    listing.ageMonthsMin !== null &&
    listing.ageMonthsMax !== null &&
    listing.ageMonthsMin === listing.ageMonthsMax
  ) {
    return formatAge(listing.ageMonthsMin)
  }

  if (listing.ageMonthsMin !== null && listing.ageMonthsMax !== null) {
    return `${formatAge(listing.ageMonthsMin)} - ${formatAge(
      listing.ageMonthsMax
    )}`
  }

  if (listing.ageMonthsMin !== null) {
    return `Da ${formatAge(listing.ageMonthsMin)}`
  }

  return `Fino a ${formatAge(listing.ageMonthsMax ?? 0)}`
}

function formatAge(months: number) {
  if (months < 12) {
    return months === 1 ? "1 mese" : `${months} mesi`
  }

  const years = Math.floor(months / 12)
  const remainingMonths = months % 12
  const yearLabel = years === 1 ? "1 anno" : `${years} anni`

  if (remainingMonths === 0) {
    return yearLabel
  }

  return `${yearLabel} e ${remainingMonths} ${
    remainingMonths === 1 ? "mese" : "mesi"
  }`
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

function formatContribution(listing: PublicListingDetail) {
  if (listing.isFree || listing.contributionCents === null) {
    return "Adozione gratuita"
  }

  return new Intl.NumberFormat("it-IT", {
    currency: "EUR",
    style: "currency",
  }).format(listing.contributionCents / 100)
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
