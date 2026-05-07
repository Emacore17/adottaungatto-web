import type {
  ListingDraftCreateInput,
  ListingDraftListQuery,
  ListingDraftUpdateInput,
  ListingImageMimeType,
  ListingImageUploadRequestInput,
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

export type ListingDraftCreateBody = ListingDraftCreateInput
export type ListingDraftUpdateBody = ListingDraftUpdateInput
export type ListingDraftListQueryParams = ListingDraftListQuery
export type ListingImageUploadBody = ListingImageUploadRequestInput
