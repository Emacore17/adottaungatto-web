import {
  listingPublicListQuerySchema,
  type ListingPublicListQuery,
} from "@workspace/validation/listings"

import { apiFetch, type ApiResult } from "@/lib/api/client"
import type {
  PublicCatBreed,
  PublicListingDetail,
  PublicListingListResponse,
} from "@/lib/api/types"

type SearchParamValue = string | string[] | undefined
type SearchParamsInput = Record<string, SearchParamValue>
type PublicListingFetchOptions = {
  cache?: RequestCache
  revalidate?: number
}

const listingSearchParamKeys = new Set([
  "page",
  "pageSize",
  "q",
  "breedId",
  "municipalityId",
  "provinceId",
  "regionId",
  "sex",
  "ageMonthsMin",
  "ageMonthsMax",
  "isFree",
  "contributionCentsMin",
  "contributionCentsMax",
  "isVaccinated",
  "isSterilized",
  "isDewormed",
  "hasMicrochip",
  "hasImages",
  "lat",
  "lng",
  "radiusKm",
  "sort",
])

export type ParsedListingSearchParams = {
  error: string | null
  query: ListingPublicListQuery
}

const defaultListingQuery = listingPublicListQuerySchema.parse({})

export function parseListingSearchParams(
  searchParams: SearchParamsInput
): ParsedListingSearchParams {
  const raw: Record<string, string> = {}

  for (const [key, value] of Object.entries(searchParams)) {
    if (!listingSearchParamKeys.has(key)) {
      continue
    }

    const firstValue = Array.isArray(value) ? value[0] : value

    if (firstValue !== undefined) {
      raw[key] = firstValue
    }
  }

  const parsed = listingPublicListQuerySchema.safeParse(raw)

  if (!parsed.success) {
    return {
      error: "I filtri applicati non sono validi.",
      query: defaultListingQuery,
    }
  }

  return {
    error: null,
    query: parsed.data,
  }
}

export function listPublicListings(
  query: Partial<ListingPublicListQuery> = {}
): Promise<ApiResult<PublicListingListResponse>> {
  const params = createListingQueryParams(query)
  const queryString = params.toString()

  return apiFetch<PublicListingListResponse>(
    queryString ? `/listings?${queryString}` : "/listings",
    {
      revalidate: 60,
      tags: ["public-listings"],
    }
  )
}

export function getPublicListing(
  id: string,
  options: PublicListingFetchOptions = {}
): Promise<ApiResult<PublicListingDetail>> {
  return apiFetch<PublicListingDetail>(
    `/listings/${id}`,
    options.cache
      ? {
          cache: options.cache,
        }
      : {
          revalidate: options.revalidate ?? 60,
          tags: [`public-listing:${id}`],
        }
  )
}

export function listPublicCatBreeds(): Promise<ApiResult<PublicCatBreed[]>> {
  return apiFetch<PublicCatBreed[]>("/listings/breeds", {
    revalidate: 3600,
    tags: ["public-cat-breeds"],
  })
}

function createListingQueryParams(query: Partial<ListingPublicListQuery>) {
  const params = new URLSearchParams()

  appendParam(params, "page", query.page)
  appendParam(params, "pageSize", query.pageSize)
  appendParam(params, "q", query.q)
  appendParam(params, "breedId", query.breedId)
  appendParam(params, "municipalityId", query.municipalityId)
  appendParam(params, "provinceId", query.provinceId)
  appendParam(params, "regionId", query.regionId)
  appendParam(params, "sex", query.sex)
  appendParam(params, "ageMonthsMin", query.ageMonthsMin)
  appendParam(params, "ageMonthsMax", query.ageMonthsMax)
  appendParam(params, "isFree", query.isFree)
  appendParam(params, "contributionCentsMin", query.contributionCentsMin)
  appendParam(params, "contributionCentsMax", query.contributionCentsMax)
  appendParam(params, "isVaccinated", query.isVaccinated)
  appendParam(params, "isSterilized", query.isSterilized)
  appendParam(params, "isDewormed", query.isDewormed)
  appendParam(params, "hasMicrochip", query.hasMicrochip)
  appendParam(params, "hasImages", query.hasImages)
  appendParam(params, "lat", query.lat)
  appendParam(params, "lng", query.lng)
  appendParam(params, "radiusKm", query.radiusKm)
  appendParam(params, "sort", query.sort)

  return params
}

function appendParam(
  params: URLSearchParams,
  key: string,
  value: boolean | number | string | null | undefined
) {
  if (value === undefined || value === null || value === "") {
    return
  }

  params.set(key, String(value))
}
