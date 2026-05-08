import type {
  PlaceAutocompleteQuery,
  PlaceAutocompleteType,
} from "@workspace/validation/places"

import { apiFetch, type ApiResult } from "@/lib/api/client"

export type PlaceAutocompleteItem = {
  type: PlaceAutocompleteType
  id: string
  label: string
  subtitle: string
  istatCode: string
  hierarchy: {
    region?: {
      id: string
      name: string
      istatCode: string
    }
    province?: {
      id: string
      name: string
      istatCode: string
    }
  }
  center: {
    lat: number
    lng: number
  } | null
}

export type PlaceAutocompleteResponse = {
  items: PlaceAutocompleteItem[]
  meta: {
    query: string
    normalizedQuery: string
    limit: number
    type: PlaceAutocompleteType | "all"
  }
}

export function autocompletePlaces(
  query: PlaceAutocompleteQuery
): Promise<ApiResult<PlaceAutocompleteResponse>> {
  const params = new URLSearchParams({
    q: query.q,
    limit: String(query.limit),
  })

  if (query.type) {
    params.set("type", query.type)
  }

  return apiFetch<PlaceAutocompleteResponse>(
    `/places/autocomplete?${params.toString()}`,
    {
      cache: "no-store",
      timeoutMs: 4000,
    }
  )
}
