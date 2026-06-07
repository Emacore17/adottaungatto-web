import Link from "next/link"
import { ArrowRightIcon, MessageCircleIcon, SearchIcon, ShieldCheckIcon } from "lucide-react"

import { ListingSearchForm } from "@/app/(public)/_components/listing-search-form"
import { NearbyListingsSection } from "@/app/(public)/_components/nearby-listings-section"
import { JsonLd } from "@/components/shared/json-ld"
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

export default async function HomePage() {
  const breedsResult = await listPublicCatBreeds()
  const breeds = breedsResult.ok ? breedsResult.data : []

  return (
    <>
      <JsonLd data={createOrganizationJsonLd()} />
      <JsonLd data={createWebsiteJsonLd()} />
      <main className="flex flex-1 flex-col">
        <section className="relative isolate overflow-hidden">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(120%_80%_at_50%_-20%,oklch(0.97_0.005_286)_0%,oklch(1_0_0)_70%)]" />
          <div className="mx-auto flex w-full max-w-7xl flex-col items-center gap-10 px-4 pt-20 pb-16 text-center sm:px-6 sm:pt-28 sm:pb-24 lg:px-8">
            <div className="grid max-w-3xl justify-items-center gap-5">
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
                <span className="size-1.5 rounded-full bg-accent" />
                Annunci verificati in tutta Italia
              </span>
              <h1 className="text-4xl leading-tight font-semibold tracking-tight text-balance text-foreground sm:text-5xl lg:text-6xl">
                Adotta il tuo gatto,
                <br />
                con la massima trasparenza.
              </h1>
              <p className="mx-auto max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                Annunci reali da rifugi, associazioni e famiglie italiane.
                Cerca per luogo, razza e caratteristiche, contatta chi se ne
                occupa.
              </p>
            </div>

            <div className="w-full max-w-4xl">
              <ListingSearchForm breeds={breeds} />
            </div>

            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheckIcon className="size-3.5" />
                Annunci verificati
              </span>
              <span className="inline-flex items-center gap-1.5">
                <MessageCircleIcon className="size-3.5" />
                Contatto diretto
              </span>
              <span className="inline-flex items-center gap-1.5">
                <SearchIcon className="size-3.5" />
                Ricerca geolocalizzata
              </span>
            </div>
          </div>
        </section>

        <NearbyListingsSection />

        <section className="border-t border-border bg-secondary/30">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
            <div className="flex flex-col items-start gap-2">
              <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Come funziona
              </h2>
              <p className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                Tre passi per un&apos;adozione consapevole.
              </p>
            </div>
            <ol className="mt-10 grid gap-6 sm:grid-cols-3">
              {[
                {
                  step: "01",
                  title: "Cerca",
                  body: "Filtra per luogo, razza, eta e caratteristiche. Vedi solo annunci pubblicati e verificati.",
                },
                {
                  step: "02",
                  title: "Contatta",
                  body: "Scrivi direttamente a chi si occupa del gatto. Niente intermediari, dati personali protetti.",
                },
                {
                  step: "03",
                  title: "Adotta",
                  body: "Conosci il gatto, valuta lo spazio adatto, prendi la decisione consapevole.",
                },
              ].map((item) => (
                <li
                  key={item.step}
                  className="rounded-xl border border-border bg-background p-6"
                >
                  <span className="text-xs font-mono text-muted-foreground">
                    {item.step}
                  </span>
                  <h3 className="mt-3 text-lg font-semibold tracking-tight">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {item.body}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="border-t border-border bg-background">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
            <div className="flex flex-col items-start gap-6 rounded-2xl border border-border bg-foreground p-8 text-background sm:p-12 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-xl">
                <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                  Hai un gatto in cerca di famiglia?
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-background/70 sm:text-base">
                  Inserisci un annuncio gratuito. La nostra moderazione
                  garantisce trasparenza e qualita.
                </p>
              </div>
              <Button
                asChild
                variant="accent"
                size="lg"
                className="shrink-0"
              >
                <Link href={routes.register}>
                  Inserisci annuncio
                  <ArrowRightIcon aria-hidden="true" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
    </>
  )
}
