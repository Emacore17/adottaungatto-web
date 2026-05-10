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
