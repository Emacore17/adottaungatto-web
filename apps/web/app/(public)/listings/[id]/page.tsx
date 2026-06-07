import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import {
  CalendarIcon,
  CheckIcon,
  ChevronRightIcon,
  MapPinIcon,
  MinusIcon,
  ShieldCheckIcon,
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

        <header className="mt-6 flex flex-col gap-4">
          <h1 className="text-3xl font-semibold tracking-tight text-balance text-foreground sm:text-4xl">
            {listing.data.title}
          </h1>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
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
            <ListingFavoriteToggle
              initialFavoriteCount={listing.data.stats.favoriteCount}
              isAuthenticated={Boolean(sessionToken)}
              isFavorite={favoriteListingIds.has(listing.data.id)}
              listingId={listing.data.id}
              nextPath={nextPath}
              syncOnMount
            />
          </div>
        </header>

        <div className="mt-8 overflow-hidden rounded-2xl">
          <ListingImageCarousel
            images={carouselImages}
            title={listing.data.title}
          />
        </div>

        <div className="mt-12 grid gap-10 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-12">
          <article className="flex min-w-0 flex-col gap-10">
            <ListingOwnerSummary owner={listing.data.owner} />

            <Separator />

            <section className="flex flex-col gap-4">
              <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                Su questo gatto
              </h2>
              <p className="text-base leading-relaxed text-foreground/90">
                {listing.data.description}
              </p>
            </section>

            <Separator />

            <section className="flex flex-col gap-5">
              <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                Identikit
              </h2>
              <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Fact label="Eta" value={formatAgeMonths(listing.data.ageMonths)} />
                <Fact label="Sesso" value={formatSex(listing.data.sex)} />
                <Fact label="Prezzo" value={formatListingPrice(listing.data)} />
                <Fact
                  label="Razza"
                  value={listing.data.breed?.name ?? "Non indicata"}
                />
              </dl>
            </section>

            <Separator />

            <section className="flex flex-col gap-5">
              <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                Salute e cura
              </h2>
              <ul className="grid gap-2 sm:grid-cols-2">
                <HealthRow label="Vaccinato" value={listing.data.isVaccinated} />
                <HealthRow
                  label="Sterilizzato"
                  value={listing.data.isSterilized}
                />
                <HealthRow label="Sverminato" value={listing.data.isDewormed} />
                <HealthRow label="Microchip" value={listing.data.hasMicrochip} />
              </ul>
            </section>

            <Separator />

            <section className="rounded-xl border border-border bg-secondary/40 p-5 sm:p-6">
              <div className="flex items-start gap-4">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-background text-accent">
                  <ShieldCheckIcon className="size-5" aria-hidden="true" />
                </span>
                <div>
                  <h3 className="text-base font-semibold tracking-tight text-foreground">
                    Adozione responsabile
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    Ogni richiesta parte da una conversazione con chi se ne
                    occupa. Niente intermediari, niente compravendita.
                  </p>
                </div>
              </div>
            </section>
          </article>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <ListingContactCard
              contactStatus={readContactStatus(query.contact)}
              hasShareablePhone={hasShareablePhone}
              isAuthenticated={Boolean(sessionToken)}
              isEnabled={listing.data.contactRequestsEnabled}
              listingId={listing.data.id}
              publicPhoneE164={listing.data.publicPhoneE164}
            />
          </aside>
        </div>
      </main>
    </>
  )
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-border bg-background p-4">
      <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </dt>
      <dd className="text-base font-semibold text-foreground">{value}</dd>
    </div>
  )
}

function HealthRow({ label, value }: { label: string; value: boolean | null }) {
  const status =
    value === true ? "confirmed" : value === false ? "missing" : "unknown"

  return (
    <li
      className={cn(
        "flex items-center gap-3 rounded-lg border border-border bg-background px-4 py-3"
      )}
    >
      <span
        className={cn(
          "flex size-7 shrink-0 items-center justify-center rounded-full",
          status === "confirmed" && "bg-emerald-50 text-emerald-700",
          status === "missing" && "bg-red-50 text-red-700",
          status === "unknown" && "bg-secondary text-muted-foreground"
        )}
      >
        {status === "confirmed" ? (
          <CheckIcon className="size-3.5" aria-hidden="true" />
        ) : (
          <MinusIcon className="size-3.5" aria-hidden="true" />
        )}
      </span>
      <div className="flex flex-1 items-center justify-between gap-3">
        <span className="text-sm font-medium text-foreground">{label}</span>
        <span className="text-xs text-muted-foreground">
          {status === "confirmed"
            ? "Sì"
            : status === "missing"
              ? "No"
              : "Non indicato"}
        </span>
      </div>
    </li>
  )
}

function ListingOwnerSummary({
  owner,
}: {
  owner: PublicListingDetail["owner"]
}) {
  return (
    <div className="flex min-w-0 items-center gap-4 rounded-xl border border-border bg-background p-4">
      <Avatar
        size="lg"
        className="size-12 bg-secondary text-base font-semibold text-foreground"
      >
        <AvatarFallback className="bg-secondary text-foreground">
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
        <span className="text-xs text-muted-foreground">
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
