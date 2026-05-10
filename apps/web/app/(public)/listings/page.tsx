import type { Metadata } from "next"
import type { PlaceAutocompleteType } from "@workspace/validation/places"
import { SearchIcon } from "lucide-react"

import { ListingCard } from "@/app/(public)/_components/listing-card"
import { ListingSearchForm } from "@/app/(public)/_components/listing-search-form"
import {
  listPublicCatBreeds,
  listPublicListings,
  parseListingSearchParams,
} from "@/lib/api/listings"
import { createPageMetadata } from "@/lib/seo/metadata"
import { Badge } from "@workspace/ui/components/badge"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@workspace/ui/components/empty"

type ListingsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export const dynamic = "force-dynamic"

export async function generateMetadata({
  searchParams,
}: ListingsPageProps): Promise<Metadata> {
  const params = await searchParams
  const parsed = parseListingSearchParams(params)

  return createPageMetadata({
    title: parsed.query.q ? `Annunci per ${parsed.query.q}` : "Annunci",
    path: parsed.query.q
      ? `/listings?q=${encodeURIComponent(parsed.query.q)}`
      : "/listings",
  })
}

export default async function ListingsPage({
  searchParams,
}: ListingsPageProps) {
  const params = await searchParams
  const parsed = parseListingSearchParams(params)
  const [listings, breedsResult] = await Promise.all([
    listPublicListings(parsed.query),
    listPublicCatBreeds(),
  ])
  const items = listings.ok ? listings.data.items : []
  const meta = listings.ok ? listings.data.meta : null
  const breeds = breedsResult.ok ? breedsResult.data : []
  const placeLabel =
    typeof params.placeLabel === "string" ? params.placeLabel : null
  const rawPlaceType =
    typeof params.placeType === "string" ? params.placeType : null
  const placeType = isSearchPlaceType(rawPlaceType) ? rawPlaceType : null

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 pb-8 pt-28 sm:px-6 sm:pt-32 lg:px-8">
      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-3">
          <Badge variant="secondary" className="w-fit">
            Annunci
          </Badge>
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <h1 className="text-3xl font-medium text-balance">
                Gatti disponibili
              </h1>
              <p className="text-sm text-muted-foreground">
                {meta ? `${meta.total} risultati` : "Risultati non disponibili"}
              </p>
            </div>
            {meta?.expansion ? (
              <Badge variant="outline">Risultati simili</Badge>
            ) : null}
          </div>
        </div>
        <ListingSearchForm
          breeds={breeds}
          defaultValues={{
            ...parsed.query,
            placeLabel,
            placeType,
          }}
        />
        {parsed.error ? (
          <p className="text-sm text-destructive">{parsed.error}</p>
        ) : null}
      </section>

      {items.length > 0 ? (
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </section>
      ) : (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <SearchIcon aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>Nessun risultato</EmptyTitle>
            <EmptyDescription>
              Prova con una ricerca diversa o torna agli annunci recenti.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
    </main>
  )
}

function isSearchPlaceType(
  value: string | null
): value is PlaceAutocompleteType | "position" {
  return (
    value === "municipality" ||
    value === "province" ||
    value === "region" ||
    value === "position"
  )
}
