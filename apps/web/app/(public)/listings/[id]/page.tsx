import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import {
  CalendarIcon,
  CatIcon,
  CheckIcon,
  ChevronRightIcon,
  type LucideIcon,
  MapPinIcon,
  MinusIcon,
  ShieldCheckIcon,
  VenusAndMarsIcon,
} from "lucide-react"

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
  const publishedDate = listing.data.publishedAt
    ? new Intl.DateTimeFormat("it-IT", { dateStyle: "long" }).format(
        new Date(listing.data.publishedAt)
      )
    : null

  return (
    <>
      <JsonLd data={createListingJsonLd(listing.data)} />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-1.5 text-xs text-muted-foreground"
        >
          <Link
            href={routes.listings()}
            className="transition-colors hover:text-foreground"
          >
            Annunci
          </Link>
          <ChevronRightIcon className="size-3" aria-hidden="true" />
          <span className="truncate text-foreground">{listing.data.title}</span>
        </nav>

        <div className="mt-5 grid gap-x-10 gap-y-8 lg:grid-cols-[minmax(0,1.6fr)_25rem] lg:items-start">
          <div className="order-1 min-w-0 overflow-hidden rounded-3xl border border-border lg:col-start-1 lg:row-start-1">
            <ListingImageCarousel
              images={carouselImages}
              title={listing.data.title}
            />
          </div>

          <aside className="order-2 flex flex-col gap-4 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:sticky lg:top-24">
            <div className="rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <h1 className="text-2xl font-extrabold tracking-tight text-balance text-foreground">
                  {listing.data.title}
                </h1>
                <ListingFavoriteToggle
                  initialFavoriteCount={listing.data.stats.favoriteCount}
                  isAuthenticated={Boolean(sessionToken)}
                  isFavorite={favoriteListingIds.has(listing.data.id)}
                  listingId={listing.data.id}
                  nextPath={nextPath}
                  syncOnMount
                />
              </div>

              <div className="mt-3">
                {listing.data.isFree ? (
                  <span className="inline-flex items-center rounded-full bg-brand-olive-soft px-3.5 py-1.5 text-base font-bold text-brand-olive">
                    Gratis
                  </span>
                ) : (
                  <p className="text-3xl font-extrabold tracking-tight tabular-nums text-foreground">
                    {formatListingPrice(listing.data)}
                  </p>
                )}
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <MapPinIcon className="size-4" aria-hidden="true" />
                  {locationLabel}
                </span>
                {publishedDate ? (
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarIcon className="size-4" aria-hidden="true" />
                    {publishedDate}
                  </span>
                ) : null}
              </div>

              <dl className="mt-5 grid grid-cols-3 gap-2">
                <QuickFact
                  icon={CalendarIcon}
                  label="Età"
                  value={formatAgeMonths(listing.data.ageMonths)}
                />
                <QuickFact
                  icon={VenusAndMarsIcon}
                  label="Sesso"
                  value={formatSex(listing.data.sex)}
                />
                <QuickFact
                  icon={CatIcon}
                  label="Razza"
                  value={listing.data.breed?.name ?? "—"}
                />
              </dl>

              <Separator className="my-5" />

              <ListingOwnerSummary owner={listing.data.owner} />
            </div>

            <ListingContactCard
              contactStatus={readContactStatus(query.contact)}
              hasShareablePhone={hasShareablePhone}
              isAuthenticated={Boolean(sessionToken)}
              isEnabled={listing.data.contactRequestsEnabled}
              listingId={listing.data.id}
              publicPhoneE164={listing.data.publicPhoneE164}
            />
          </aside>

          <article className="order-3 flex min-w-0 flex-col gap-8 lg:col-start-1 lg:row-start-2 lg:mt-2">
            <section className="flex flex-col gap-4">
              <h2 className="text-xl font-bold tracking-tight text-foreground">
                Su questo gatto
              </h2>
              <p className="text-base leading-relaxed text-foreground/90">
                {listing.data.description}
              </p>
            </section>

            <Separator />

            <section className="flex flex-col gap-5">
              <h2 className="text-xl font-bold tracking-tight text-foreground">
                Salute e cura
              </h2>
              <ul className="flex flex-wrap gap-2.5">
                <HealthPill
                  labels={{
                    confirmed: "Vaccinato",
                    missing: "Non vaccinato",
                    unknown: "Vaccinazione non indicata",
                  }}
                  value={listing.data.isVaccinated}
                />
                <HealthPill
                  labels={{
                    confirmed: "Sterilizzato",
                    missing: "Non sterilizzato",
                    unknown: "Sterilizzazione non indicata",
                  }}
                  value={listing.data.isSterilized}
                />
                <HealthPill
                  labels={{
                    confirmed: "Sverminato",
                    missing: "Non sverminato",
                    unknown: "Sverminazione non indicata",
                  }}
                  value={listing.data.isDewormed}
                />
                <HealthPill
                  labels={{
                    confirmed: "Microchip",
                    missing: "Senza microchip",
                    unknown: "Microchip non indicato",
                  }}
                  value={listing.data.hasMicrochip}
                />
              </ul>
            </section>

            <section className="flex items-start gap-4 rounded-2xl border border-brand-teal/20 bg-brand-teal-soft p-5 sm:p-6">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-background text-brand-teal">
                <ShieldCheckIcon className="size-5" aria-hidden="true" />
              </span>
              <div>
                <h3 className="text-base font-bold tracking-tight text-foreground">
                  Adozione responsabile
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  Ogni richiesta parte da una conversazione con chi se ne
                  occupa. Niente intermediari, niente compravendita.
                </p>
              </div>
            </section>
          </article>
        </div>
      </main>
    </>
  )
}

function QuickFact({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon
  label: string
  value: string
}) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-2xl bg-secondary/60 px-1.5 py-3 text-center">
      <Icon className="size-4 text-primary" aria-hidden="true" />
      <dt className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
        {label}
      </dt>
      <dd className="text-sm leading-tight font-bold text-balance text-foreground">
        {value}
      </dd>
    </div>
  )
}

function HealthPill({
  labels,
  value,
}: {
  labels: { confirmed: string; missing: string; unknown: string }
  value: boolean | null
}) {
  const status =
    value === true ? "confirmed" : value === false ? "missing" : "unknown"

  return (
    <li
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-medium",
        status === "confirmed" && "bg-brand-olive-soft text-brand-olive",
        status === "missing" && "bg-brand-coral-soft text-primary",
        status === "unknown" && "bg-secondary text-muted-foreground"
      )}
    >
      {status === "confirmed" ? (
        <CheckIcon className="size-4" aria-hidden="true" />
      ) : (
        <MinusIcon className="size-4" aria-hidden="true" />
      )}
      {labels[status]}
    </li>
  )
}

function ListingOwnerSummary({
  owner,
}: {
  owner: PublicListingDetail["owner"]
}) {
  return (
    <div className="flex min-w-0 items-center gap-4 rounded-2xl border border-border bg-card p-4">
      <Avatar
        size="lg"
        className="size-12 bg-brand-coral-soft text-base font-semibold text-primary"
      >
        <AvatarFallback className="bg-brand-coral-soft text-primary">
          {getOwnerInitials(owner.displayName)}
        </AvatarFallback>
      </Avatar>
      <div className="flex min-w-0 flex-1 flex-col">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Pubblicato da
        </p>
        <p className="truncate text-base font-semibold text-foreground">
          {owner.displayName}
        </p>
        <span className="mt-1 inline-flex w-fit items-center gap-1 rounded-full bg-brand-teal-soft px-2 py-0.5 text-xs font-semibold text-brand-teal">
          <ShieldCheckIcon className="size-3" aria-hidden="true" />
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
