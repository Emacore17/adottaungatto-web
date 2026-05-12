import type { ListingPublicSort } from "@workspace/validation/listings"
import type { PlaceAutocompleteType } from "@workspace/validation/places"

type ListingsRouteQuery = {
  page?: number
  pageSize?: number
  q?: string
  breedId?: string
  municipalityId?: string
  provinceId?: string
  regionId?: string
  sex?: string
  ageMonthsMin?: number
  ageMonthsMax?: number
  isFree?: boolean
  contributionCentsMin?: number
  contributionCentsMax?: number
  isVaccinated?: boolean
  isSterilized?: boolean
  isDewormed?: boolean
  hasMicrochip?: boolean
  hasImages?: boolean
  lat?: number
  lng?: number
  radiusKm?: number
  sort?: ListingPublicSort
  placeLabel?: string
  placeType?: PlaceAutocompleteType | "position"
}

function withSearchParams(path: string, query: Record<string, unknown> = {}) {
  const params = new URLSearchParams()

  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") {
      continue
    }

    params.set(key, String(value))
  }

  const queryString = params.toString()

  return queryString ? `${path}?${queryString}` : path
}

export const routes = {
  home: "/",
  listings: (query?: ListingsRouteQuery) =>
    withSearchParams("/listings", query),
  listing: (id: string) => `/listings/${id}`,
  login: (next?: string) => withSearchParams("/login", { next }),
  register: "/register",
  account: "/account",
  accountListingSubmitted: "/account/listings/submitted",
  accountDrafts: "/account/listings/drafts",
  accountDraftNew: "/account/listings/drafts/new",
  accountDraft: (id: string) => `/account/listings/drafts/${id}`,
  accountFavorites: "/account/favorites",
  accountNotifications: "/account/notifications",
  accountSettings: "/account/settings",
  moderation: "/moderation",
}
