import type {
  ListingContactCreateInput,
  ListingContactRequestListQuery,
} from "@workspace/validation/contacts"

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

export type ReceivedListingContactRequest = {
  id: string
  listing: {
    id: string
    title: string
  }
  requester: {
    id: string
    displayName: string
    email: string | null
  }
  message: string
  status: "failed" | "pending" | "sent"
  emailShared: boolean
  createdAt: string
  deliveredAt: string | null
  failedAt: string | null
  failureReason: string | null
}

export type ReceivedListingContactRequestListResponse = {
  items: ReceivedListingContactRequest[]
  meta: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
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

export function listReceivedListingContactRequests(
  bearerToken: string,
  query: Partial<ListingContactRequestListQuery> = {}
): Promise<ApiResult<ReceivedListingContactRequestListResponse>> {
  return apiFetch<ReceivedListingContactRequestListResponse>(
    createQueryPath("/contacts/me/received", query),
    {
      bearerToken,
      cache: "no-store",
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
