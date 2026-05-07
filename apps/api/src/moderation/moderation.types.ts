export type ListingModerationStatus =
  | "draft"
  | "pending_review"
  | "approved"
  | "rejected"
  | "suspended"

export type ListingLifecycleStatus =
  | "draft"
  | "published"
  | "expired"
  | "adopted"
  | "deleted"

export type ModerationQueueItem = {
  case: {
    id: string
    status: "open"
    reasonCode: string | null
    openedAt: string
    assignedToUserId: string | null
  }
  listing: {
    id: string
    title: string
    slug: string
    description: string
    moderationStatus: "pending_review"
    lifecycleStatus: "draft"
    createdAt: string
    updatedAt: string
  }
  owner: {
    id: string
    email: string
    displayName: string
  }
  location: {
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
  } | null
  images: {
    readyCount: number
    cover: {
      id: string
      objectKeyThumb: string | null
      objectKeyLarge: string | null
    } | null
  }
}

export type ModerationQueueResponse = {
  items: ModerationQueueItem[]
  meta: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

export type ReportedListingQueueItem = {
  case: {
    id: string
    status: "open"
    reasonCode: string | null
    openedAt: string
    assignedToUserId: string | null
  }
  listing: {
    id: string
    title: string
    slug: string
    description: string
    moderationStatus: ListingModerationStatus
    lifecycleStatus: ListingLifecycleStatus
    publishedAt: string | null
    expiresAt: string | null
    createdAt: string
    updatedAt: string
  }
  owner: {
    id: string
    email: string
    displayName: string
  }
  location: ModerationQueueItem["location"]
  images: ModerationQueueItem["images"]
  reports: {
    count: number
    firstReportedAt: string
    latestReportedAt: string
    latest: {
      id: string
      reporterUserId: string | null
      reporterEmail: string | null
      reporterDisplayName: string | null
      reasonCode: string
      description: string | null
      createdAt: string
    } | null
  }
}

export type ReportedListingQueueResponse = {
  items: ReportedListingQueueItem[]
  meta: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

export type ModerationDecisionAction = "approve" | "reject" | "suspend"

export type ReportResolutionStatus = "resolved" | "dismissed"

export type ModerationDecisionResponse = {
  decided: true
  decision: {
    action: "approved" | "rejected" | "suspended"
    reasonCode: string | null
    reasonText: string | null
  }
  action: {
    id: string
  }
  case: {
    id: string
    status: "approved" | "rejected" | "suspended"
    closedAt: string
  }
  listing: {
    id: string
    moderationStatus: "approved" | "rejected" | "suspended"
    lifecycleStatus: "draft" | "published"
    publishedAt: string | null
    updatedAt: string
  }
  reports: {
    status: ReportResolutionStatus
    count: number
  }
}
