import type { Metadata } from "next"
import Link from "next/link"
import type { PlaceAutocompleteType } from "@workspace/validation/places"
import { SearchIcon } from "lucide-react"

import { ListingCard } from "@/app/(public)/_components/listing-card"
import { ListingSearchForm } from "@/app/(public)/_components/listing-search-form"
import {
  listPublicCatBreeds,
  listPublicListings,
  parseListingSearchParams,
} from "@/lib/api/listings"
import { listFavoriteListingIds } from "@/lib/api/favorites"
import type { PublicListingExpansion } from "@/lib/api/types"
import { getSessionToken } from "@/lib/auth/session"
import { routes } from "@/lib/routes"
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

type ListingsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}
type ListingQuery = ReturnType<typeof parseListingSearchParams>["query"]

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
  const [listings, breedsResult, sessionToken] = await Promise.all([
    listPublicListings(parsed.query),
    listPublicCatBreeds(),
    getSessionToken(),
  ])
  const items = listings.ok ? listings.data.items : []
  const suggestions = listings.ok ? listings.data.suggestions : null
  const suggestionItems = suggestions?.items ?? []
  const meta = listings.ok ? listings.data.meta : null
  const breeds = breedsResult.ok ? breedsResult.data : []
  const placeLabel =
    typeof params.placeLabel === "string" ? params.placeLabel : null
  const rawPlaceType =
    typeof params.placeType === "string" ? params.placeType : null
  const placeType = isSearchPlaceType(rawPlaceType) ? rawPlaceType : null
  const nextPath = routes.listings({
    ...parsed.query,
    placeLabel: placeLabel ?? undefined,
    placeType: placeType ?? undefined,
  })
  const favoriteListingIds = sessionToken
    ? await listFavoriteListingIds(
        sessionToken,
        Array.from(
          new Set(
            [...items, ...suggestionItems].map((item) => item.id)
          )
        )
      )
    : new Set<string>()
  const expansionMessage = meta?.expansion
    ? formatExpansionMessage(meta.expansion)
    : null

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 pt-28 pb-8 sm:px-6 sm:pt-32 lg:px-8">
      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-3">
          <Badge
            variant="outline"
            className="w-fit border-brand-teal/25 bg-brand-teal-soft text-brand-teal-ink"
          >
            Annunci
          </Badge>
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <h1 className="text-3xl font-medium text-balance">
                Gatti disponibili
              </h1>
              <p className="text-sm text-muted-foreground">
                {meta
                  ? meta.expansion
                    ? `${meta.total} suggerimenti`
                    : `${meta.total} risultati`
                  : "Risultati non disponibili"}
              </p>
            </div>
            {meta?.expansion ? (
              <Badge
                variant="outline"
                className="border-brand-amber/30 bg-brand-amber-soft text-brand-teal-ink"
              >
                Risultati simili
              </Badge>
            ) : null}
          </div>
        </div>
        {expansionMessage ? (
          <p className="rounded-lg border bg-card px-3 py-2 text-sm text-muted-foreground shadow-sm">
            {expansionMessage}
          </p>
        ) : null}
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
        <>
          <section className="flex flex-col gap-4">
            {items.map((listing) => (
              <ListingCard
                key={listing.id}
                isAuthenticated={Boolean(sessionToken)}
                isFavorite={favoriteListingIds.has(listing.id)}
                listing={listing}
                nextPath={nextPath}
              />
            ))}
          </section>
          {meta && meta.totalPages > 1 ? (
            <PaginationFooter
              page={meta.page}
              totalPages={meta.totalPages}
              previousHref={createListingsPagePath(
                parsed.query,
                Math.max(meta.page - 1, 1),
                placeLabel,
                placeType
              )}
              nextHref={createListingsPagePath(
                parsed.query,
                Math.min(meta.page + 1, Math.max(meta.totalPages, 1)),
                placeLabel,
                placeType
              )}
            />
          ) : null}
        </>
      ) : suggestionItems.length > 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <SearchIcon aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>Nessun risultato esatto</EmptyTitle>
            <EmptyDescription>
              Ti mostro alternative ordinate per pertinenza.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
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

      {suggestions && suggestionItems.length > 0 ? (
        <section className="flex flex-col gap-4 border-t pt-6">
          <div className="flex flex-col gap-2">
            <Badge
              variant="outline"
              className="w-fit border-brand-amber/30 bg-brand-amber-soft text-brand-teal-ink"
            >
              Suggerimenti
            </Badge>
            <div className="grid gap-1">
              <h2 className="text-2xl font-medium">{suggestions.title}</h2>
              <p className="text-sm text-muted-foreground">
                {formatSuggestionsMessage(suggestions.reason)}
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-4">
            {suggestionItems.map((listing) => (
              <ListingCard
                key={listing.id}
                isAuthenticated={Boolean(sessionToken)}
                isFavorite={favoriteListingIds.has(listing.id)}
                listing={listing}
                nextPath={nextPath}
              />
            ))}
          </div>
        </section>
      ) : null}
    </main>
  )
}

function PaginationFooter({
  nextHref,
  page,
  previousHref,
  totalPages,
}: {
  nextHref: string
  page: number
  previousHref: string
  totalPages: number
}) {
  const safeTotalPages = Math.max(totalPages, 1)

  return (
    <div className="flex flex-col items-center justify-between gap-3 text-sm text-muted-foreground sm:flex-row">
      <span>
        Pagina {page} di {safeTotalPages}
      </span>
      <div className="flex gap-2">
        <Button asChild variant="outline" size="sm">
          <Link aria-disabled={page <= 1} href={previousHref}>
            Precedente
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link aria-disabled={page >= safeTotalPages} href={nextHref}>
            Successiva
          </Link>
        </Button>
      </div>
    </div>
  )
}

function createListingsPagePath(
  query: ListingQuery,
  page: number,
  placeLabel: string | null,
  placeType: PlaceAutocompleteType | "position" | null
) {
  return routes.listings({
    ...query,
    page,
    placeLabel: placeLabel ?? undefined,
    placeType: placeType ?? undefined,
  })
}

function formatSuggestionsMessage(
  reason: "empty_exact" | "end_of_results" | "not_enough_results"
) {
  if (reason === "empty_exact") {
    return "Non ci sono corrispondenze esatte: questi annunci sono i piu vicini alla ricerca."
  }

  if (reason === "end_of_results") {
    return "Hai visto tutti i risultati richiesti: qui trovi altri annunci pertinenti."
  }

  return "I risultati richiesti sono pochi: completo la pagina con annunci pertinenti."
}

function formatExpansionMessage(expansion: PublicListingExpansion) {
  if (expansion.type === "trigram_text") {
    return `Non ho trovato corrispondenze esatte per "${expansion.originalQuery}", quindi ti mostro annunci con testo simile.`
  }

  if (expansion.type === "expanded_radius") {
    return expansion.originalRadiusKm
      ? `Non ci sono annunci entro ${expansion.originalRadiusKm} km, quindi ti mostro quelli piu vicini disponibili.`
      : "Non ci sono annunci nel raggio richiesto, quindi ti mostro quelli piu vicini disponibili."
  }

  return "Nessun annuncio coincide con tutti i filtri: ti mostro alternative ordinate per vicinanza alla richiesta."
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
