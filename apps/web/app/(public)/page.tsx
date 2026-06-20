import Link from "next/link"
import {
  ArrowRightIcon,
  GiftIcon,
  HeartHandshakeIcon,
  MessageCircleIcon,
  SearchIcon,
  ShieldCheckIcon,
} from "lucide-react"

import { ListingSearchForm } from "@/app/(public)/_components/listing-search-form"
import { NearbyListingsSection } from "@/app/(public)/_components/nearby-listings-section"
import { JsonLd } from "@/components/shared/json-ld"
import { Reveal } from "@/components/shared/reveal"
import { StorageImage } from "@/components/shared/storage-image"
import { getPublicObjectUrl } from "@/lib/api/assets"
import { listPublicCatBreeds, listPublicListings } from "@/lib/api/listings"
import type { PublicListingSummary } from "@/lib/api/types"
import { routes } from "@/lib/routes"
import {
  createOrganizationJsonLd,
  createWebsiteJsonLd,
} from "@/lib/seo/json-ld"
import { createPageMetadata } from "@/lib/seo/metadata"
import { Button } from "@workspace/ui/components/button"

export const dynamic = "force-dynamic"

export const metadata = createPageMetadata({
  title: "Gatti in adozione",
  path: "/",
})

const heroQuickFilters = [
  { label: "Cuccioli", href: routes.listings({ ageMonthsMax: 12 }) },
  { label: "Adulti", href: routes.listings({ ageMonthsMin: 12 }) },
  { label: "In regalo", href: routes.listings({ isFree: true }) },
  { label: "Tutti gli annunci", href: routes.listings() },
]

const howItWorksSteps = [
  {
    icon: SearchIcon,
    title: "Cerca",
    body: "Filtra per luogo, razza, età e caratteristiche. Vedi solo annunci pubblicati dopo una revisione reale.",
  },
  {
    icon: MessageCircleIcon,
    title: "Contatta",
    body: "Scrivi a chi si occupa del gatto, senza intermediari. I tuoi dati restano protetti finché non decidi tu.",
  },
  {
    icon: HeartHandshakeIcon,
    title: "Adotta",
    body: "Conosci il gatto, valuta gli spazi, decidi con calma. L'adozione è una scelta, non un acquisto.",
  },
]

const trustHighlights = [
  {
    icon: ShieldCheckIcon,
    label: "Annunci verificati",
  },
  {
    icon: MessageCircleIcon,
    label: "Contatto diretto",
  },
  {
    icon: GiftIcon,
    label: "100% gratuito",
  },
]

export default async function HomePage() {
  const [breedsResult, heroResult] = await Promise.all([
    listPublicCatBreeds(),
    listPublicListings({ pageSize: 4, sort: "recent", hasImages: true }),
  ])
  const breeds = breedsResult.ok ? breedsResult.data : []
  const heroListings = heroResult.ok ? heroResult.data.items : []
  const popularBreeds = breeds.slice(0, 10)

  return (
    <>
      <JsonLd data={createOrganizationJsonLd()} />
      <JsonLd data={createWebsiteJsonLd()} />
      <main className="flex flex-1 flex-col">
        <section className="relative overflow-hidden border-b border-border bg-gradient-to-b from-brand-coral-soft/70 via-background to-background">
          <div className="relative mx-auto grid w-full max-w-7xl gap-10 px-4 pt-12 pb-14 sm:px-6 sm:pt-16 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-12 lg:px-8 lg:pt-20 lg:pb-20">
            <div className="flex flex-col">
              <span className="rise-in inline-flex w-fit items-center gap-2 rounded-full border border-brand-teal/25 bg-background/70 px-3 py-1 text-xs font-semibold text-brand-teal">
                <ShieldCheckIcon aria-hidden="true" className="size-3.5" />
                Ogni annuncio revisionato da persone reali
              </span>
              <h1 className="rise-in mt-5 max-w-xl text-4xl font-extrabold tracking-tight text-balance text-foreground [--rise-delay:80ms] sm:text-5xl lg:text-6xl">
                Trova il gatto giusto,{" "}
                <span className="text-brand-gradient">vicino a te</span>.
              </h1>
              <p className="rise-in mt-5 max-w-lg text-base leading-relaxed text-muted-foreground [--rise-delay:160ms] sm:text-lg">
                Annunci verificati da rifugi, associazioni e famiglie in tutta
                Italia. Contatto diretto, senza intermediari.
              </p>

              <div className="rise-in mt-8 [--rise-delay:240ms]">
                <ListingSearchForm breeds={breeds} />
              </div>

              <div className="rise-in mt-5 flex flex-wrap items-center gap-2 [--rise-delay:320ms]">
                <span className="text-xs font-medium text-muted-foreground">
                  Ricerche frequenti
                </span>
                {heroQuickFilters.map((filter) => (
                  <Link
                    key={filter.label}
                    href={filter.href}
                    className="inline-flex items-center rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:border-foreground/30 hover:bg-secondary"
                  >
                    {filter.label}
                  </Link>
                ))}
              </div>
            </div>

            <HeroPhotoMosaic listings={heroListings} />
          </div>
        </section>

        <section
          aria-label="Garanzie del servizio"
          className="border-b border-border bg-background"
        >
          <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-center gap-x-10 gap-y-2 px-4 py-4 sm:px-6 lg:px-8">
            {trustHighlights.map((highlight) => (
              <span
                key={highlight.label}
                className="inline-flex items-center gap-2 text-[13px] font-semibold text-muted-foreground"
              >
                <highlight.icon
                  aria-hidden="true"
                  className="size-4 text-primary"
                />
                {highlight.label}
              </span>
            ))}
          </div>
        </section>

        {popularBreeds.length > 0 ? (
          <section className="border-b border-border bg-background">
            <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 sm:py-14 lg:px-8">
              <div className="flex flex-col gap-1.5">
                <h2 className="text-2xl font-bold tracking-tight text-balance sm:text-3xl">
                  Sfoglia per razza
                </h2>
                <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
                  Dai più comuni ai meno conosciuti. Tocca una razza per vedere
                  i gatti disponibili.
                </p>
              </div>
              <div className="mt-6 flex flex-wrap gap-2.5">
                {popularBreeds.map((breed) => (
                  <Link
                    key={breed.id}
                    href={routes.listings({ breedId: breed.id })}
                    className="card-lift inline-flex items-center rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground hover:border-primary/40 hover:bg-brand-coral-soft hover:text-primary"
                  >
                    {breed.name}
                  </Link>
                ))}
                <Link
                  href={routes.listings()}
                  className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-brand-coral-soft"
                >
                  Tutte le razze
                  <ArrowRightIcon aria-hidden="true" className="size-4" />
                </Link>
              </div>
            </div>
          </section>
        ) : null}

        <NearbyListingsSection />

        <section className="border-t border-border bg-muted/60">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
            <div className="grid gap-10 lg:grid-cols-[2fr_3fr] lg:gap-16">
              <Reveal>
                <div className="flex h-full flex-col items-start gap-4 lg:sticky lg:top-24">
                  <h2 className="text-2xl font-bold tracking-tight text-balance sm:text-3xl">
                    Come funziona
                  </h2>
                  <p className="max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">
                    Tre passi, nessun intermediario. Ogni annuncio passa da una
                    revisione reale prima di andare online.
                  </p>
                  <Button asChild variant="outline" className="mt-2">
                    <Link href={routes.listings()}>Guarda gli annunci</Link>
                  </Button>
                </div>
              </Reveal>
              <div className="flex flex-col divide-y divide-border">
                {howItWorksSteps.map((step, index) => (
                  <Reveal
                    key={step.title}
                    delay={index * 100}
                    className="py-7 first:pt-0 last:pb-0"
                  >
                    <div className="flex items-start gap-5">
                      <span className="relative inline-flex size-12 shrink-0 items-center justify-center rounded-2xl bg-brand-coral-soft text-primary">
                        <step.icon aria-hidden="true" className="size-5" />
                        <span className="absolute -top-2 -right-2 inline-flex size-6 items-center justify-center rounded-full bg-foreground text-xs font-bold text-background">
                          {index + 1}
                        </span>
                      </span>
                      <div className="min-w-0">
                        <h3 className="text-lg font-bold tracking-tight">
                          {step.title}
                        </h3>
                        <p className="mt-1.5 max-w-prose text-sm leading-relaxed text-muted-foreground">
                          {step.body}
                        </p>
                      </div>
                    </div>
                  </Reveal>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section>
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
            <Reveal>
              <div className="relative overflow-hidden rounded-3xl bg-foreground px-8 py-12 text-background sm:px-12 sm:py-14">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -top-16 -right-10 size-56 rounded-full bg-brand-coral/20 blur-3xl"
                />
                <div className="relative flex flex-col items-start gap-7 lg:flex-row lg:items-center lg:justify-between">
                  <div className="max-w-xl">
                    <h2 className="text-2xl font-bold tracking-tight text-balance sm:text-3xl">
                      Hai un gatto in cerca di famiglia?
                    </h2>
                    <p className="mt-3 text-sm leading-relaxed text-background/70 sm:text-base">
                      Inserisci un annuncio gratuito. Ogni annuncio passa da una
                      moderazione reale prima di andare online.
                    </p>
                  </div>
                  <Button asChild size="lg" className="shrink-0">
                    <Link href={routes.register}>Inserisci annuncio</Link>
                  </Button>
                </div>
              </div>
            </Reveal>
          </div>
        </section>
      </main>
    </>
  )
}

function HeroPhotoMosaic({
  listings,
}: {
  listings: PublicListingSummary[]
}) {
  const photos = listings
    .map((listing) => {
      const cover = listing.images.cover
      const url = getPublicObjectUrl(
        cover?.objectKeyLarge ?? cover?.objectKeyThumb
      )

      return url
        ? {
            id: listing.id,
            url,
            blurDataUrl: cover?.blurDataUrl ?? null,
            title: listing.title,
          }
        : null
    })
    .filter((photo): photo is NonNullable<typeof photo> => photo !== null)
    .slice(0, 3)

  const [first, second, third] = photos

  if (!first || !second || !third) {
    return (
      <div
        aria-hidden="true"
        className="relative hidden aspect-[4/5] max-h-[30rem] overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-brand-coral-soft via-background to-brand-amber-soft lg:block"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_25%,_var(--brand-coral-soft),_transparent_55%)]" />
        <HeartHandshakeIcon className="absolute top-1/2 left-1/2 size-20 -translate-x-1/2 -translate-y-1/2 text-primary/40" />
      </div>
    )
  }

  return (
    <div className="relative hidden lg:block">
      <div className="grid grid-cols-2 grid-rows-2 gap-4">
        <Link
          href={routes.listing(first.id)}
          className="photo-in card-lift group relative col-span-1 row-span-2 aspect-[3/4] overflow-hidden rounded-3xl border border-border bg-secondary shadow-xl shadow-foreground/10"
        >
          <StorageImage
            src={first.url}
            alt={first.title}
            blurDataUrl={first.blurDataUrl}
            fill
            priority
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
            sizes="(min-width: 1024px) 24rem, 0px"
          />
        </Link>
        <Link
          href={routes.listing(second.id)}
          className="photo-in card-lift group relative aspect-square overflow-hidden rounded-3xl border border-border bg-secondary shadow-lg shadow-foreground/10 [--photo-delay:120ms]"
        >
          <StorageImage
            src={second.url}
            alt={second.title}
            blurDataUrl={second.blurDataUrl}
            fill
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
            sizes="(min-width: 1024px) 16rem, 0px"
          />
        </Link>
        <Link
          href={routes.listing(third.id)}
          className="photo-in card-lift group relative aspect-square overflow-hidden rounded-3xl border border-border bg-secondary shadow-lg shadow-foreground/10 [--photo-delay:220ms]"
        >
          <StorageImage
            src={third.url}
            alt={third.title}
            blurDataUrl={third.blurDataUrl}
            fill
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
            sizes="(min-width: 1024px) 16rem, 0px"
          />
        </Link>
      </div>
      <div className="photo-in absolute -bottom-4 -left-4 flex items-center gap-2.5 rounded-2xl border border-border bg-card px-4 py-3 shadow-lg shadow-foreground/10 [--photo-delay:340ms]">
        <span className="inline-flex size-9 items-center justify-center rounded-full bg-brand-olive-soft text-brand-olive">
          <HeartHandshakeIcon aria-hidden="true" className="size-5" />
        </span>
        <div className="leading-tight">
          <p className="text-sm font-bold text-foreground">Adozioni reali</p>
          <p className="text-xs text-muted-foreground">
            Gatti che cercano casa ora
          </p>
        </div>
      </div>
    </div>
  )
}
