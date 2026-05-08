import type { ListingPublicSort } from "@workspace/validation/listings"

type ListingsRouteQuery = {
  page?: number
  pageSize?: number
  q?: string
  sort?: ListingPublicSort
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
  listings: (query?: ListingsRouteQuery) => withSearchParams("/listings", query),
  listing: (id: string) => `/listings/${id}`,
  login: (next?: string) => withSearchParams("/login", { next }),
  register: "/register",
  account: "/account",
  accountDrafts: "/account/listings/drafts",
  moderation: "/moderation",
}
