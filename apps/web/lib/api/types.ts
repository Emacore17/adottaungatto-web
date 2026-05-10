import type { ListingPublicSort, ListingSex } from "@workspace/validation/listings"

export type PublicListingImage = {
  id: string
  objectKeyLarge: string | null
  objectKeyThumb: string | null
  width: number | null
  height: number | null
  blurHash: string | null
  sortOrder: number
  isCover: boolean
}

export type PublicCatBreed = {
  id: string
  name: string
  slug: string
}

export type PublicListingSummary = {
  id: string
  title: string
  slug: string
  description: string
  breed: {
    id: string
    name: string
    slug: string
  } | null
  sex: ListingSex
  ageMonthsMin: number | null
  ageMonthsMax: number | null
  location: {
    municipality: {
      id: string
      name: string
      istatCode: string
    }
    province: {
      id: string
      name: string
      istatCode: string
    }
    region: {
      id: string
      name: string
      istatCode: string
    }
    center: {
      lat: number
      lng: number
    } | null
  } | null
  contributionCents: number | null
  isFree: boolean
  isVaccinated: boolean | null
  isSterilized: boolean | null
  isDewormed: boolean | null
  hasMicrochip: boolean | null
  contactRequestsEnabled: boolean
  publishedAt: string | null
  expiresAt: string | null
  createdAt: string
  updatedAt: string
  owner: {
    id: string
    displayName: string
    profileType: string
  }
  stats: {
    likeCount: number
  }
  images: {
    readyCount: number
    cover: PublicListingImage | null
  }
}

export type PublicListingDetail = PublicListingSummary & {
  images: PublicListingSummary["images"] & {
    items: PublicListingImage[]
  }
}

export type PublicListingExpansion = {
  type: "trigram_text"
  reason: "empty_full_text"
  originalQuery: string
}

export type PublicListingListResponse = {
  items: PublicListingSummary[]
  meta: {
    page: number
    pageSize: number
    total: number
    totalPages: number
    query: string | null
    sort: ListingPublicSort
    rankingVersion: "postgres-v1"
    expansion: PublicListingExpansion | null
  }
}
