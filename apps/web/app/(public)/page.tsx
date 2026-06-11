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
    iconClassName: "bg-brand-coral-soft text-primary",
    title: "Cerca",
    body: "Filtra per luogo, razza, età e caratteristiche. Vedi solo annunci pubblicati dopo una revisione reale.",
  },
  {
    icon: MessageCircleIcon,
    iconClassName: "bg-brand-teal-soft text-brand-teal",
    title: "Contatta",
    body: "Scrivi a chi si occupa del gatto, senza intermediari. I tuoi dati restano protetti finché non decidi tu.",
  },
  {
    icon: HeartHandshakeIcon,
    iconClassName: "bg-brand-olive-soft text-brand-olive",
    title: "Adotta",
    body: "Conosci il gatto, valuta gli spazi, decidi con calma. L'adozione è una scelta, non un acquisto.",
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
        <section className="border-b border-border bg-muted/60">
          <div className="mx-auto w-full max-w-7xl px-4 pt-14 pb-12 text-center sm:px-6 sm:pt-20 sm:pb-16 lg:px-8">
            <h1 className="mx-auto max-w-3xl text-4xl font-extrabold tracking-tight text-balance text-foreground sm:text-5xl">
              Trova il gatto giusto,{" "}
              <span className="text-primary">vicino a te</span>.
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              Annunci verificati da rifugi, associazioni e famiglie in tutta
              Italia. Contatto diretto, senza intermediari.
            </p>

            <div className="mx-auto mt-8 max-w-4xl text-left sm:mt-10">
              <ListingSearchForm breeds={breeds} />
            </div>

            <div className="mt-7 flex flex-wrap items-center justify-center gap-x-7 gap-y-2">
              <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-brand-teal">
                <ShieldCheckIcon strokeWidth={2} className="size-4" />
                Annunci verificati
              </span>
              <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-brand-teal">
                <MessageCircleIcon strokeWidth={2} className="size-4" />
                Contatto diretto
              </span>
              <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-brand-teal">
                <GiftIcon strokeWidth={2} className="size-4" />
                100% gratuito
              </span>
            </div>
          </div>
        </section>

        <NearbyListingsSection />

        <section className="border-t border-border bg-muted/60">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
            <Reveal>
              <h2 className="text-2xl font-bold tracking-tight text-balance sm:text-3xl">
                Come funziona
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                Tre passi, nessun intermediario.
              </p>
            </Reveal>
            <div className="mt-10 grid gap-8 sm:grid-cols-3 sm:gap-6">
              {howItWorksSteps.map((step, index) => (
                <Reveal key={step.title} delay={index * 100}>
                  <div className="flex h-full flex-col">
                    <span
                      className={`inline-flex size-11 items-center justify-center rounded-xl ${step.iconClassName}`}
                    >
                      <step.icon
                        aria-hidden="true"
                        strokeWidth={2}
                        className="size-5"
                      />
                    </span>
                    <h3 className="mt-4 text-lg font-bold tracking-tight">
                      {step.title}
                    </h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                      {step.body}
                    </p>
                  </div>
                </Reveal>
              ))}
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
