import type { FavoriteListQuery } from "@workspace/validation/favorites"
import type {
  ListingDraftCreateInput,
  ListingDraftListQuery,
  ListingDraftUpdateInput,
  ListingImageOrderInput,
  ListingImageMimeType,
  ListingImageUploadRequestInput,
  ListingSex,
} from "@workspace/validation/listings"
import type { NotificationListQuery } from "@workspace/validation/notifications"

import { apiFetch, type ApiResult } from "@/lib/api/client"

type ListingLocation = {
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
  center?: {
    lat: number
    lng: number
  } | null
} | null

type PaginationMeta = {
  page: number
  pageSize: number
  total: number
  totalPages: number
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
  location: ListingLocation
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

export type ListingDraftListResponse = {
  items: ListingDraft[]
  meta: PaginationMeta
}

export type ListingDraftDeleteResponse = {
  deleted: true
}

export type ListingReviewSubmission = Omit<ListingDraft, "moderationStatus"> & {
  moderationStatus: "pending_review"
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
  location: ListingLocation
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
  meta: PaginationMeta
}

export type FavoriteDeleteResponse = {
  deleted: boolean
}

export type FavoriteMutationResponse = {
  favorited: boolean
  created: boolean
  item: FavoriteListingItem
}

export type NotificationType =
  | "listing_moderation_decision"
  | "listing_review_submission"
  | "listing_contact_request"
  | "listing_report_decision"

export type Notification = {
  id: string
  type: NotificationType
  payload: Record<string, unknown>
  readAt: string | null
  createdAt: string
}

export type NotificationListResponse = {
  items: Notification[]
  meta: PaginationMeta & {
    unreadCount: number
  }
}

export type NotificationMarkAllReadResponse = {
  updatedCount: number
}

export function listAccountDrafts(
  bearerToken: string,
  query: Partial<ListingDraftListQuery> = {}
): Promise<ApiResult<ListingDraftListResponse>> {
  return apiFetch<ListingDraftListResponse>(
    createQueryPath("/listings/me/drafts", query),
    {
      bearerToken,
      cache: "no-store",
    }
  )
}

export function getAccountDraft(
  bearerToken: string,
  draftId: string
): Promise<ApiResult<ListingDraft>> {
  return apiFetch<ListingDraft>(`/listings/me/drafts/${draftId}`, {
    bearerToken,
    cache: "no-store",
  })
}

export function createAccountDraft(
  bearerToken: string,
  input: ListingDraftCreateInput
): Promise<ApiResult<ListingDraft>> {
  return apiFetch<ListingDraft>("/listings/me/drafts", {
    bearerToken,
    body: input,
    cache: "no-store",
    method: "POST",
  })
}

export function updateAccountDraft(
  bearerToken: string,
  draftId: string,
  input: ListingDraftUpdateInput
): Promise<ApiResult<ListingDraft>> {
  return apiFetch<ListingDraft>(`/listings/me/drafts/${draftId}`, {
    bearerToken,
    body: input,
    cache: "no-store",
    method: "PATCH",
  })
}

export function submitAccountDraftForReview(
  bearerToken: string,
  draftId: string
): Promise<ApiResult<ListingDraftSubmissionResponse>> {
  return apiFetch<ListingDraftSubmissionResponse>(
    `/listings/me/drafts/${draftId}/submit-review`,
    {
      bearerToken,
      cache: "no-store",
      method: "POST",
    }
  )
}

export function createAccountDraftImageUpload(
  bearerToken: string,
  draftId: string,
  input: ListingImageUploadRequestInput
): Promise<ApiResult<ListingImageUploadResponse>> {
  return apiFetch<ListingImageUploadResponse>(
    `/listings/me/drafts/${draftId}/images/upload-url`,
    {
      bearerToken,
      body: input,
      cache: "no-store",
      method: "POST",
    }
  )
}

export function confirmAccountDraftImageUpload(
  bearerToken: string,
  draftId: string,
  imageId: string
): Promise<ApiResult<ListingImageConfirmationResponse>> {
  return apiFetch<ListingImageConfirmationResponse>(
    `/listings/me/drafts/${draftId}/images/${imageId}/confirm`,
    {
      bearerToken,
      cache: "no-store",
      method: "POST",
    }
  )
}

export function listAccountDraftImages(
  bearerToken: string,
  draftId: string
): Promise<ApiResult<ListingImageListResponse>> {
  return apiFetch<ListingImageListResponse>(
    `/listings/me/drafts/${draftId}/images`,
    {
      bearerToken,
      cache: "no-store",
    }
  )
}

export function deleteAccountDraftImage(
  bearerToken: string,
  draftId: string,
  imageId: string
): Promise<ApiResult<ListingImageDeleteResponse>> {
  return apiFetch<ListingImageDeleteResponse>(
    `/listings/me/drafts/${draftId}/images/${imageId}`,
    {
      bearerToken,
      cache: "no-store",
      method: "DELETE",
    }
  )
}

export function reorderAccountDraftImages(
  bearerToken: string,
  draftId: string,
  input: ListingImageOrderInput
): Promise<ApiResult<ListingImageOrderResponse>> {
  return apiFetch<ListingImageOrderResponse>(
    `/listings/me/drafts/${draftId}/images/order`,
    {
      bearerToken,
      body: input,
      cache: "no-store",
      method: "PATCH",
    }
  )
}

export function setAccountDraftCoverImage(
  bearerToken: string,
  draftId: string,
  imageId: string
): Promise<ApiResult<ListingImageCoverResponse>> {
  return apiFetch<ListingImageCoverResponse>(
    `/listings/me/drafts/${draftId}/images/${imageId}/cover`,
    {
      bearerToken,
      cache: "no-store",
      method: "PATCH",
    }
  )
}

export function listAccountFavorites(
  bearerToken: string,
  query: Partial<FavoriteListQuery> = {}
): Promise<ApiResult<FavoriteListResponse>> {
  return apiFetch<FavoriteListResponse>(
    createQueryPath("/favorites/listings", query),
    {
      bearerToken,
      cache: "no-store",
    }
  )
}

export function addAccountFavorite(
  bearerToken: string,
  listingId: string
): Promise<ApiResult<FavoriteMutationResponse>> {
  return apiFetch<FavoriteMutationResponse>(
    `/favorites/listings/${listingId}`,
    {
      bearerToken,
      body: {},
      cache: "no-store",
      method: "POST",
    }
  )
}

export function removeAccountFavorite(
  bearerToken: string,
  listingId: string
): Promise<ApiResult<FavoriteDeleteResponse>> {
  return apiFetch<FavoriteDeleteResponse>(`/favorites/listings/${listingId}`, {
    bearerToken,
    cache: "no-store",
    method: "DELETE",
  })
}

export function listAccountNotifications(
  bearerToken: string,
  query: Partial<NotificationListQuery> = {}
): Promise<ApiResult<NotificationListResponse>> {
  return apiFetch<NotificationListResponse>(
    createQueryPath("/notifications", query),
    {
      bearerToken,
      cache: "no-store",
    }
  )
}

export function markAccountNotificationRead(
  bearerToken: string,
  notificationId: string
): Promise<ApiResult<Notification>> {
  return apiFetch<Notification>(`/notifications/${notificationId}/read`, {
    bearerToken,
    cache: "no-store",
    method: "POST",
  })
}

export function markAllAccountNotificationsRead(
  bearerToken: string
): Promise<ApiResult<NotificationMarkAllReadResponse>> {
  return apiFetch<NotificationMarkAllReadResponse>("/notifications/read-all", {
    bearerToken,
    cache: "no-store",
    method: "POST",
  })
}

export function deleteAccountDraft(
  bearerToken: string,
  draftId: string
): Promise<ApiResult<ListingDraftDeleteResponse>> {
  return apiFetch<ListingDraftDeleteResponse>(
    `/listings/me/drafts/${draftId}`,
    {
      bearerToken,
      cache: "no-store",
      method: "DELETE",
    }
  )
}

function createQueryPath(path: string, query: Record<string, unknown>) {
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
