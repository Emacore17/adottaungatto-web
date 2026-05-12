export type ListingContactRequestStatus = "failed" | "pending" | "sent"

export type ListingContactRequest = {
  id: string
  listingId: string
  requesterUserId: string
  ownerUserId: string
  status: "sent"
  emailShared: boolean
  phoneShared: boolean
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
    phoneE164: string | null
  }
  message: string
  status: ListingContactRequestStatus
  emailShared: boolean
  phoneShared: boolean
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
