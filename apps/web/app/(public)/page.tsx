import { HomeHeroBackground } from "@/app/(public)/_components/home-hero-background"
import { ListingSearchForm } from "@/app/(public)/_components/listing-search-form"
import { NearbyListingsSection } from "@/app/(public)/_components/nearby-listings-section"
import { JsonLd } from "@/components/shared/json-ld"
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

export default function HomePage() {
  return (
    <>
      <JsonLd data={createOrganizationJsonLd()} />
      <JsonLd data={createWebsiteJsonLd()} />
      <main className="flex flex-1 flex-col">
        <section className="relative isolate flex min-h-[calc(78svh-6rem)] items-center border-b bg-background">
          <HomeHeroBackground />
          <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-7 px-4 py-10 text-center sm:px-6 lg:px-8">
            <div className="grid max-w-4xl gap-3">
              <h1 className="text-4xl font-semibold tracking-normal text-balance sm:text-5xl lg:text-6xl">
                Trova il gatto giusto da adottare
              </h1>
              <p className="mx-auto max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
                Cerca per parola chiave, luogo e filtri essenziali.
              </p>
            </div>

            <div className="w-full max-w-5xl">
              <ListingSearchForm />
            </div>
          </div>
        </section>

        <NearbyListingsSection />
      </main>
    </>
  )
}
