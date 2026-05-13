import { apiFetch, type ApiResult } from "@/lib/api/client"
import type {
  ListingLikeMutationResponse,
  ListingLikeStateResponse,
} from "@/lib/api/types"

function getListingLikeState(
  bearerToken: string,
  listingId: string
): Promise<ApiResult<ListingLikeStateResponse>> {
  return apiFetch<ListingLikeStateResponse>(`/likes/listings/${listingId}/me`, {
    bearerToken,
    cache: "no-store",
  })
}

function likeListing(
  bearerToken: string,
  listingId: string
): Promise<ApiResult<ListingLikeMutationResponse>> {
  return apiFetch<ListingLikeMutationResponse>(`/likes/listings/${listingId}`, {
    bearerToken,
    cache: "no-store",
    method: "POST",
  })
}

function unlikeListing(
  bearerToken: string,
  listingId: string
): Promise<ApiResult<ListingLikeMutationResponse>> {
  return apiFetch<ListingLikeMutationResponse>(`/likes/listings/${listingId}`, {
    bearerToken,
    cache: "no-store",
    method: "DELETE",
  })
}

export { getListingLikeState, likeListing, unlikeListing }
