import type { FavoriteListQuery } from "@workspace/validation"

export type FavoriteListingSummary = {
  id: string
  title: string
  slug: string
  description: string
  publishedAt: string | null
  expiresAt: string | null
  owner: {
    id: string
    displayName: string
  }
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
  } | null
  images: {
    readyCount: number
    cover: {
      id: string
      objectKeyThumb: string | null
      objectKeyLarge: string | null
    } | null
  }
}

export type FavoriteListingItem = {
  favoritedAt: string
  listing: FavoriteListingSummary
}

export type FavoriteListResponse = {
  items: FavoriteListingItem[]
  meta: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

export type FavoriteMutationResponse = {
  favorited: boolean
  created: boolean
  item: FavoriteListingItem
}

export type FavoriteDeleteResponse = {
  deleted: boolean
}

export type FavoriteListQueryParams = FavoriteListQuery
