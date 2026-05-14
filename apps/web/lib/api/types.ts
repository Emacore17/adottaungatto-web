import type {
  ListingPublicSort,
  ListingSex,
} from "@workspace/validation/listings"

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
  ageMonths: number | null
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
  publicPhoneE164: string | null
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
    favoriteCount: number
    likeCount: number
  }
  sponsorship: {
    isSponsored: boolean
    label: string | null
    placement: string | null
  }
  images: {
    readyCount: number
    cover: PublicListingImage | null
    preview: PublicListingImage[]
  }
}

export type PublicListingDetail = PublicListingSummary & {
  images: PublicListingSummary["images"] & {
    items: PublicListingImage[]
  }
}

export type PublicListingExpansion =
  | {
      type: "trigram_text"
      reason: "empty_full_text"
      originalQuery: string
    }
  | {
      type: "expanded_radius"
      reason: "empty_radius"
      originalQuery: string | null
      originalRadiusKm: number | null
    }
  | {
      type: "relaxed_filters"
      reason: "empty_filtered"
      originalQuery: string | null
      originalRadiusKm: number | null
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
