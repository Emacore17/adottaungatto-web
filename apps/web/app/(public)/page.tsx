import Link from "next/link"
import { ArrowRightIcon, SearchIcon } from "lucide-react"

import { ListingCard } from "@/app/(public)/_components/listing-card"
import { ListingSearchForm } from "@/app/(public)/_components/listing-search-form"
import { JsonLd } from "@/components/shared/json-ld"
import { listPublicListings } from "@/lib/api/listings"
import { routes } from "@/lib/routes"
import { createOrganizationJsonLd, createWebsiteJsonLd } from "@/lib/seo/json-ld"
import { createPageMetadata } from "@/lib/seo/metadata"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@workspace/ui/components/empty"

export const dynamic = "force-dynamic"

export const metadata = createPageMetadata({
  title: "Gatti in adozione",
  path: "/",
})

export default async function HomePage() {
  const listings = await listPublicListings({
    page: 1,
    pageSize: 6,
    sort: "recent",
  })

  const items = listings.ok ? listings.data.items : []

  return (
    <>
      <JsonLd data={createOrganizationJsonLd()} />
      <JsonLd data={createWebsiteJsonLd()} />
      <main className="flex flex-1 flex-col">
        <section className="border-b">
          <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:px-8">
            <div className="flex min-w-0 flex-col gap-6">
              <div className="flex max-w-2xl flex-col gap-3">
                <Badge variant="secondary" className="w-fit">
                  Adozioni in Italia
                </Badge>
                <h1 className="text-3xl font-medium tracking-normal text-balance sm:text-4xl">
                  Gatti in adozione
                </h1>
                <p className="max-w-2xl text-base leading-7 text-muted-foreground">
                  Cerca annunci pubblicati da privati, associazioni e rifugi,
                  filtrando per luogo e caratteristiche essenziali.
                </p>
              </div>
              <ListingSearchForm />
            </div>

            <div className="grid content-start gap-3 rounded-lg border bg-card p-4 text-sm">
              <div>
                <p className="font-medium">Annunci verificati</p>
                <p className="text-muted-foreground">
                  Schede essenziali, immagini e localita in primo piano.
                </p>
              </div>
              <Button asChild variant="outline">
                <Link href={routes.listings()}>
                  Sfoglia annunci
                  <ArrowRightIcon data-icon="inline-end" aria-hidden="true" />
                </Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <h2 className="text-xl font-medium">Annunci recenti</h2>
              <p className="text-sm text-muted-foreground">
                Prime schede pubblicate e pronte per la consultazione.
              </p>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href={routes.listings()}>
                Vedi tutti
                <ArrowRightIcon data-icon="inline-end" aria-hidden="true" />
              </Link>
            </Button>
          </div>

          {items.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          ) : (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <SearchIcon aria-hidden="true" />
                </EmptyMedia>
                <EmptyTitle>Nessun annuncio pubblicato</EmptyTitle>
                <EmptyDescription>
                  Gli annunci approvati appariranno qui.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </section>
      </main>
    </>
  )
}
