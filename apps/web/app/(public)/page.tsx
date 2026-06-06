import { HomeHeroBackground } from "@/app/(public)/_components/home-hero-background"
import { ListingSearchForm } from "@/app/(public)/_components/listing-search-form"
import { NearbyListingsSection } from "@/app/(public)/_components/nearby-listings-section"
import { JsonLd } from "@/components/shared/json-ld"
import { listPublicCatBreeds } from "@/lib/api/listings"
import {
  createOrganizationJsonLd,
  createWebsiteJsonLd,
} from "@/lib/seo/json-ld"
import { createPageMetadata } from "@/lib/seo/metadata"
import { Badge } from "@workspace/ui/components/badge"

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
      <main className="brand-light-surface flex flex-1 flex-col bg-brand-cream text-brand-ink">
        <section className="home-hero-surface relative flex min-h-[88svh] items-center overflow-hidden border-b border-border/70">
          <HomeHeroBackground />
          <div className="relative mx-auto flex w-full max-w-6xl flex-col items-center gap-9 px-4 pt-32 pb-16 text-center sm:px-6 sm:pt-40 sm:pb-20 lg:px-8">
            <div className="grid max-w-4xl justify-items-center gap-5">
              <Badge
                variant="secondary"
                className="border border-brand-amber/25 bg-brand-amber-soft px-4 py-1.5 text-[11px] font-semibold tracking-[0.22em] text-brand-teal-ink uppercase"
              >
                Annunci verificati in tutta Italia
              </Badge>
              <h1
                className="font-heading text-[2.75rem] leading-[1.04] font-normal tracking-[-0.02em] text-balance sm:text-6xl lg:text-7xl xl:text-[5.5rem]"
                style={{ fontVariationSettings: '"opsz" 144, "SOFT" 60' }}
              >
                Trova il <em className="home-hero-title-accent not-italic">gatto</em>{" "}
                giusto da{" "}
                <em className="home-hero-title-accent-alt italic">adottare</em>.
              </h1>
              <p className="mx-auto max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
                Annunci reali da rifugi, associazioni e famiglie italiane.
                Cerca per luogo, razza e caratteristiche; confronta schede
                curate e contatta chi si occupa del gatto.
              </p>
            </div>

            <div className="w-full max-w-5xl">
              <ListingSearchForm breeds={breeds} />
            </div>
          </div>
        </section>

        <NearbyListingsSection />
      </main>
    </>
  )
}
