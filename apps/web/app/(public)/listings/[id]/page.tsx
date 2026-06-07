import type { Metadata } from "next"
import { notFound } from "next/navigation"
import {
  CalendarIcon,
  HeartHandshakeIcon,
  MapPinIcon,
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
import { Badge } from "@workspace/ui/components/badge"
import { Separator } from "@workspace/ui/components/separator"
import { cn } from "@workspace/ui/lib/utils"

type ListingDetailPageProps = {
  params: Promise<{
    id: string
  }>
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

type ListingFactIcon = "age" | "sex" | "price" | "breed"

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
      <main className="relative flex-1 pb-16">
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 -z-10 h-[80svh] bg-[linear-gradient(180deg,color-mix(in_oklab,var(--color-brand-teal-soft)_60%,var(--color-brand-cream))_0%,var(--color-brand-cream)_72%)]"
        />

        <div className="mx-auto w-full max-w-6xl px-4 pt-28 sm:px-6 sm:pt-32 lg:px-8">
          <header className="flex flex-col gap-6">
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.28em] text-brand-coral-strong uppercase">
                <MapPinIcon aria-hidden="true" className="size-3.5" />
                {locationLabel}
              </span>
              {listing.data.publishedAt ? (
                <>
                  <span aria-hidden="true" className="text-brand-border">
                    ·
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                    <CalendarIcon aria-hidden="true" className="size-3" />
                    {new Intl.DateTimeFormat("it-IT", {
                      dateStyle: "medium",
                    }).format(new Date(listing.data.publishedAt))}
                  </span>
                </>
              ) : null}
            </div>

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
              <h1 className="font-heading text-5xl leading-[0.95] font-normal tracking-[-0.025em] text-balance text-brand-teal-ink sm:text-6xl lg:text-[5rem]">
                {listing.data.title}
              </h1>
              <ListingFavoriteToggle
                className="self-start lg:self-end"
                emphasis="prominent"
                initialFavoriteCount={listing.data.stats.favoriteCount}
                isAuthenticated={Boolean(sessionToken)}
                isFavorite={favoriteListingIds.has(listing.data.id)}
                listingId={listing.data.id}
                nextPath={nextPath}
                syncOnMount
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className={cn(
                  "rounded-full border-0 px-3.5 py-1.5 text-xs font-semibold tracking-wide",
                  listing.data.isFree
                    ? "bg-brand-olive-soft text-brand-olive-strong"
                    : "bg-brand-coral-soft text-brand-coral-strong"
                )}
              >
                {formatListingPrice(listing.data)}
              </Badge>
              {listing.data.breed ? (
                <Badge
                  variant="outline"
                  className="rounded-full border-0 bg-brand-teal-soft px-3.5 py-1.5 text-xs font-semibold tracking-wide text-brand-teal-ink"
                >
                  {listing.data.breed.name}
                </Badge>
              ) : null}
              <Badge
                variant="outline"
                className="rounded-full border-0 bg-brand-amber-soft px-3.5 py-1.5 text-xs font-semibold tracking-wide text-brand-teal-ink"
              >
                {formatSex(listing.data.sex)}
              </Badge>
              <Badge
                variant="outline"
                className="rounded-full border-0 bg-brand-cream px-3.5 py-1.5 text-xs font-semibold tracking-wide text-brand-teal-ink shadow-[0_2px_8px_-4px_rgba(0,0,0,0.1)]"
              >
                {formatAgeMonths(listing.data.ageMonths)}
              </Badge>
            </div>
          </header>

          <div className="mt-10 overflow-hidden rounded-[36px] shadow-[0_40px_100px_-48px_rgba(60,30,10,0.5)] ring-1 ring-brand-border/40">
            <ListingImageCarousel
              images={carouselImages}
              title={listing.data.title}
            />
          </div>

          <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-14">
            <article className="flex min-w-0 flex-col gap-12">
              <ListingOwnerSummary owner={listing.data.owner} />

              <section className="flex flex-col gap-5">
                <h2 className="flex items-baseline gap-3 font-heading text-3xl leading-tight font-normal tracking-[-0.015em] text-brand-teal-ink sm:text-4xl">
                  <em className="italic text-brand-coral-strong">Descrizione</em>
                </h2>
                <div className="max-w-prose text-[17px] leading-[1.9] text-foreground/85 first-letter:font-heading first-letter:mr-2 first-letter:float-left first-letter:text-[4rem] first-letter:leading-[0.9] first-letter:font-normal first-letter:text-brand-coral-strong">
                  <p>{listing.data.description}</p>
                </div>
              </section>

              <Separator className="bg-brand-border/50" />

              <section className="flex flex-col gap-6">
                <h2 className="flex items-baseline gap-3 font-heading text-3xl leading-tight font-normal tracking-[-0.015em] text-brand-teal-ink sm:text-4xl">
                  <em className="italic text-brand-coral-strong">A colpo</em>{" "}
                  d&apos;occhio
                </h2>
                <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <ListingFact
                    icon="age"
                    label="Eta"
                    value={formatAgeMonths(listing.data.ageMonths)}
                  />
                  <ListingFact
                    icon="sex"
                    label="Sesso"
                    value={formatSex(listing.data.sex)}
                  />
                  <ListingFact
                    icon="price"
                    label="Prezzo"
                    value={formatListingPrice(listing.data)}
                  />
                  <ListingFact
                    icon="breed"
                    label="Razza"
                    value={listing.data.breed?.name ?? "Non indicata"}
                  />
                </dl>
              </section>

              <Separator className="bg-brand-border/50" />

              <section className="flex flex-col gap-6">
                <h2 className="flex items-baseline gap-3 font-heading text-3xl leading-tight font-normal tracking-[-0.015em] text-brand-teal-ink sm:text-4xl">
                  <em className="italic text-brand-coral-strong">Salute</em> e
                  cura
                </h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  <HealthRow
                    label="Vaccinato"
                    value={listing.data.isVaccinated}
                  />
                  <HealthRow
                    label="Sterilizzato"
                    value={listing.data.isSterilized}
                  />
                  <HealthRow
                    label="Sverminato"
                    value={listing.data.isDewormed}
                  />
                  <HealthRow
                    label="Microchip"
                    value={listing.data.hasMicrochip}
                  />
                </div>
              </section>

              <Separator className="bg-brand-border/50" />

              <section className="rounded-3xl bg-brand-teal-soft/65 p-7 sm:p-9">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-brand-coral-soft text-brand-coral-strong">
                    <HeartHandshakeIcon
                      aria-hidden="true"
                      className="size-6"
                    />
                  </span>
                  <div>
                    <p className="text-[11px] font-semibold tracking-[0.22em] text-brand-coral-strong uppercase">
                      Adozione responsabile
                    </p>
                    <p className="font-heading text-xl leading-tight font-normal tracking-[-0.01em] text-brand-teal-ink sm:text-2xl">
                      Ogni richiesta parte da una conversazione vera con chi se
                      ne occupa.
                    </p>
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
              <div className="flex items-start gap-3 rounded-2xl border border-brand-border/60 bg-card/80 px-4 py-3 text-xs text-muted-foreground">
                <ShieldCheckIcon
                  aria-hidden="true"
                  className="size-4 shrink-0 text-brand-teal-strong"
                />
                <span>
                  I dati personali restano riservati. Il contatto avviene
                  tramite la piattaforma.
                </span>
              </div>
            </aside>
          </div>
        </div>
      </main>
    </>
  )
}

function ListingFact({
  className,
  icon,
  label,
  value,
}: {
  className?: string
  icon: ListingFactIcon
  label: string
  value: string
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-2xl border border-brand-border/60 bg-card p-5 shadow-[0_12px_28px_-22px_rgba(60,30,10,0.35)]",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold tracking-[0.22em] text-brand-coral-strong uppercase">
          {label}
        </span>
        <span className="inline-flex size-7 items-center justify-center rounded-full bg-brand-teal-soft text-[14px] text-brand-teal-strong">
          {iconForFact(icon)}
        </span>
      </div>
      <p className="font-heading text-xl leading-tight font-normal tracking-[-0.01em] text-brand-teal-ink sm:text-2xl">
        {value}
      </p>
    </div>
  )
}

function HealthRow({
  label,
  value,
}: {
  label: string
  value: boolean | null
}) {
  const status =
    value === true ? "confirmed" : value === false ? "missing" : "unknown"

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-2xl border px-4 py-3.5 transition-colors",
        status === "confirmed" &&
          "border-brand-olive/30 bg-brand-olive-soft/50",
        status === "missing" &&
          "border-brand-coral/25 bg-brand-coral-soft/50",
        status === "unknown" && "border-brand-border/60 bg-card/70"
      )}
    >
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-full text-base font-semibold",
          status === "confirmed" &&
            "bg-brand-olive-strong text-brand-cream",
          status === "missing" &&
            "bg-brand-coral-strong text-brand-cream",
          status === "unknown" && "bg-brand-border/60 text-brand-teal-ink"
        )}
      >
        {status === "confirmed" ? "✓" : status === "missing" ? "✕" : "?"}
      </span>
      <div className="flex flex-1 flex-col">
        <span className="font-heading text-base font-normal tracking-tight text-brand-teal-ink">
          {label}
        </span>
        <span className="text-xs text-muted-foreground">
          {status === "confirmed"
            ? "Confermato"
            : status === "missing"
              ? "Assente"
              : "Non indicato"}
        </span>
      </div>
    </div>
  )
}

function iconForFact(icon: ListingFactIcon) {
  switch (icon) {
    case "age":
      return "⏳"
    case "sex":
      return "⚥"
    case "price":
      return "€"
    case "breed":
      return "✦"
  }
}

function ListingOwnerSummary({
  owner,
}: {
  owner: PublicListingDetail["owner"]
}) {
  return (
    <div className="flex min-w-0 items-center gap-5 rounded-3xl border border-brand-border/60 bg-card px-5 py-4 shadow-[0_18px_36px_-28px_rgba(60,30,10,0.45)] sm:px-6">
      <Avatar
        size="lg"
        className="size-16 bg-brand-coral-soft text-lg text-brand-coral-strong"
      >
        <AvatarFallback className="bg-brand-coral-soft text-brand-coral-strong">
          {getOwnerInitials(owner.displayName)}
        </AvatarFallback>
      </Avatar>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="text-[10px] font-semibold tracking-[0.22em] text-muted-foreground uppercase">
          Pubblicato da
        </p>
        <p className="font-heading truncate text-xl leading-tight font-normal tracking-[-0.015em] text-brand-teal-ink sm:text-[1.4rem]">
          {owner.displayName}
        </p>
        <span className="text-xs font-medium text-brand-coral-strong">
          {formatOwnerProfileType(owner.profileType)}
        </span>
      </div>
      <ShieldCheckIcon
        aria-hidden="true"
        className="hidden size-6 text-brand-teal-strong sm:block"
      />
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
