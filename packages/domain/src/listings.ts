export const listingModerationStatuses = [
  "draft",
  "pending_review",
  "approved",
  "rejected",
  "suspended",
] as const

export type ListingModerationStatus = (typeof listingModerationStatuses)[number]

export const listingLifecycleStatuses = [
  "draft",
  "published",
  "expired",
  "adopted",
  "deleted",
] as const

export type ListingLifecycleStatus = (typeof listingLifecycleStatuses)[number]

export const listingSexes = ["male", "female", "unknown"] as const

export type ListingSex = (typeof listingSexes)[number]

export const listingImageStatuses = [
  "uploaded",
  "processing",
  "ready",
  "rejected",
  "deleted",
] as const

export type ListingImageStatus = (typeof listingImageStatuses)[number]
