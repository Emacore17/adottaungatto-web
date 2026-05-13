import type {
  ListingDraftCreateInput,
  ListingDraftListQuery,
  ListingDraftUpdateInput,
  ListingImageOrderInput,
  ListingImageMimeType,
  ListingImageUploadRequestInput,
  ListingPublicListQuery,
  ListingSex,
} from "@workspace/validation"

export type ListingDraftLocation = {
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
}

export type ListingDraft = {
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
  location: ListingDraftLocation | null
  contributionCents: number | null
  isFree: boolean
  isVaccinated: boolean | null
  isSterilized: boolean | null
  isDewormed: boolean | null
  hasMicrochip: boolean | null
  contactRequestsEnabled: boolean
  moderationStatus: "draft"
  lifecycleStatus: "draft"
  createdAt: string
  updatedAt: string
}

export type ListingReviewSubmission = Omit<ListingDraft, "moderationStatus"> & {
  moderationStatus: "pending_review"
}

export type ListingDraftListResponse = {
  items: ListingDraft[]
  meta: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

export type ListingDraftDeleteResponse = {
  deleted: true
}

export type ListingDraftSubmissionResponse = {
  submitted: true
  listing: ListingReviewSubmission
}

export type ListingImage = {
  id: string
  listingId: string
  objectKeyOriginal: string
  objectKeyLarge: string | null
  objectKeyThumb: string | null
  mimeType: ListingImageMimeType
  width: number | null
  height: number | null
  sizeBytes: number
  checksum: string | null
  blurHash: string | null
  sortOrder: number
  isCover: boolean
  status: "uploaded" | "processing" | "ready" | "rejected"
  rejectionReason: string | null
  createdAt: string
  updatedAt: string
}

export type ListingImageUploadResponse = {
  image: ListingImage
  upload: {
    method: "PUT"
    url: string
    headers: {
      "Content-Type": ListingImageMimeType
    }
    expiresInSeconds: number
    maxSizeBytes: number
  }
}

export type ListingImageConfirmationResponse = {
  confirmed: true
  image: ListingImage
}

export type ListingImageListResponse = {
  items: ListingImage[]
  meta: {
    total: number
    readyCount: number
    pendingCount: number
    rejectedCount: number
    coverImageId: string | null
    maxItems: number
  }
}

export type ListingImageDeleteResponse = {
  deleted: true
  imageId: string
  images: ListingImageListResponse
}

export type ListingImageCoverResponse = {
  image: ListingImage
  images: ListingImageListResponse
}

export type ListingImageOrderResponse = {
  images: ListingImageListResponse
}

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
  breed: ListingDraft["breed"]
  sex: ListingSex
  ageMonthsMin: number | null
  ageMonthsMax: number | null
  location: ListingDraftLocation | null
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
    sort: "relevance" | "recent" | "distance"
    rankingVersion: "postgres-v1"
    expansion: PublicListingExpansion | null
  }
}

export type ListingDraftCreateBody = ListingDraftCreateInput
export type ListingDraftUpdateBody = ListingDraftUpdateInput
export type ListingDraftListQueryParams = ListingDraftListQuery
export type ListingPublicListQueryParams = ListingPublicListQuery
export type ListingImageUploadBody = ListingImageUploadRequestInput
export type ListingImageOrderBody = ListingImageOrderInput
