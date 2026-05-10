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
        <section className="home-hero-surface relative flex min-h-[78svh] items-center border-b">
          <HomeHeroBackground />
          <div className="relative mx-auto flex w-full max-w-6xl flex-col items-center gap-7 px-4 pb-10 pt-32 text-center sm:px-6 sm:pt-36 lg:px-8">
            <div className="grid max-w-4xl gap-3">
              <h1 className="text-4xl leading-[1.14] font-semibold tracking-normal text-balance sm:text-5xl sm:leading-[1.1] lg:text-6xl">
                Trova il{" "}
                <span className="home-hero-title-accent">gatto</span> giusto da{" "}
                <span className="home-hero-title-accent-alt">adottare</span>
              </h1>
              <p className="mx-auto max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
                Cerca per parola chiave, luogo e filtri essenziali.
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
