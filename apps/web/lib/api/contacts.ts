import type { ListingContactCreateInput } from "@workspace/validation/contacts"

import { apiFetch, type ApiResult } from "@/lib/api/client"

export type ListingContactRequest = {
  id: string
  listingId: string
  requesterUserId: string
  ownerUserId: string
  status: "sent"
  emailShared: boolean
  createdAt: string
  deliveredAt: string
}

export type ListingContactRequestResponse = {
  sent: true
  request: ListingContactRequest
}

export function createListingContactRequest(
  bearerToken: string,
  listingId: string,
  input: ListingContactCreateInput
): Promise<ApiResult<ListingContactRequestResponse>> {
  return apiFetch<ListingContactRequestResponse>(
    `/contacts/listings/${listingId}`,
    {
      bearerToken,
      body: input,
      cache: "no-store",
      method: "POST",
    }
  )
}
