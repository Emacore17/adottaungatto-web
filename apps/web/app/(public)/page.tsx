import Link from "next/link"
import {
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
import { listPublicCatBreeds } from "@/lib/api/listings"
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
  const breedsResult = await listPublicCatBreeds()
  const breeds = breedsResult.ok ? breedsResult.data : []

  return (
    <>
      <JsonLd data={createOrganizationJsonLd()} />
      <JsonLd data={createWebsiteJsonLd()} />
      <main className="flex flex-1 flex-col">
        <section className="relative overflow-hidden border-b border-border bg-muted/60">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 overflow-hidden"
          >
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--brand-coral-soft)_0%,_transparent_60%)] opacity-70 dark:opacity-40" />
            <div className="drift-slow absolute -top-32 left-[12%] size-[26rem] rounded-full bg-brand-coral-soft blur-3xl will-change-transform" />
            <div className="drift-slower absolute top-[20%] -right-24 size-[22rem] rounded-full bg-brand-amber-soft opacity-70 blur-3xl will-change-transform dark:opacity-50" />
          </div>
          <div className="relative mx-auto w-full max-w-7xl px-4 pt-14 pb-12 text-center sm:px-6 sm:pt-20 sm:pb-16 lg:px-8">
            <h1 className="rise-in mx-auto max-w-3xl text-4xl font-extrabold tracking-tight text-balance text-foreground sm:text-5xl">
              Trova il gatto giusto,{" "}
              <span className="text-primary">vicino a te</span>.
            </h1>
            <p className="rise-in mx-auto mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground [--rise-delay:120ms] sm:text-lg">
              Annunci verificati da rifugi, associazioni e famiglie in tutta
              Italia. Contatto diretto, senza intermediari.
            </p>

            <div className="rise-in mx-auto mt-8 max-w-4xl text-left [--rise-delay:240ms] sm:mt-10">
              <ListingSearchForm breeds={breeds} />
            </div>
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
                      <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-coral-soft text-primary">
                        <step.icon aria-hidden="true" className="size-5" />
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
              <div className="rounded-2xl bg-foreground px-8 py-12 text-background sm:px-12 sm:py-14">
                <div className="flex flex-col items-start gap-7 lg:flex-row lg:items-center lg:justify-between">
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
