export type ListingLikeCountResponse = {
  listingId: string
  likeCount: number
}

export type ListingLikeMutationResponse = ListingLikeCountResponse & {
  liked: boolean
  changed: boolean
}

export type ListingLikeStateResponse = ListingLikeCountResponse & {
  liked: boolean
}
