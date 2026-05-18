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

export type ModerationCaseStatus =
  | "open"
  | "approved"
  | "rejected"
  | "suspended"
  | "closed"

export type ModerationActionType =
  | "opened"
  | "assigned"
  | "approved"
  | "rejected"
  | "suspended"
  | "closed"
  | "commented"
  | "reported"

export type ModerationAuditAction = {
  id: string
  action: ModerationActionType
  reasonCode: string | null
  reasonText: string | null
  fromStatus: ListingModerationStatus | null
  toStatus: ListingModerationStatus | null
  createdAt: string
  actor: {
    id: string
    email: string
    displayName: string
  } | null
}

export type ModerationAudit = {
  actions: ModerationAuditAction[]
}

export type ModerationQueueImage = {
  id: string
  objectKeyThumb: string | null
  objectKeyLarge: string | null
  isCover: boolean
  sortOrder: number
}

export type ModerationQueueItem = {
  case: {
    id: string
    status: "open"
    reasonCode: string | null
    openedAt: string
    assignedToUserId: string | null
    assignedTo: ModerationAssignedUser | null
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
    preview: ModerationQueueImage[]
  }
  audit: ModerationAudit
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
    assignedTo: ModerationAssignedUser | null
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
  audit: ModerationAudit
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

export type ModerationRecentActionItem = {
  action: {
    id: string
    type: ModerationActionType
    reasonCode: string | null
    reasonText: string | null
    fromStatus: ListingModerationStatus | null
    toStatus: ListingModerationStatus | null
    createdAt: string
  }
  case: {
    id: string
    status: ModerationCaseStatus
    assignedToUserId: string | null
    assignedTo: ModerationAssignedUser | null
  }
  listing: {
    id: string
    title: string
    slug: string
    moderationStatus: ListingModerationStatus
    lifecycleStatus: ListingLifecycleStatus
  }
  owner: {
    id: string
    email: string
    displayName: string
  }
  actor: {
    id: string
    email: string
    displayName: string
  } | null
}

export type ModerationAssignedUser = {
  id: string
  email: string
  displayName: string
}

export type ModerationRecentActionsResponse = {
  items: ModerationRecentActionItem[]
  meta: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

export type ModerationDecisionAction = "approve" | "reject" | "suspend"

export type ReportResolutionStatus = "resolved" | "dismissed"

export type ModerationClaimResponse = {
  claimed: true
  action: {
    id: string
  } | null
  case: {
    id: string
    assignedToUserId: string
    updatedAt: string
  }
}

export type ModerationCommentResponse = {
  commented: true
  action: {
    id: string
    createdAt: string
  }
  case: {
    id: string
    status: ModerationCaseStatus
    updatedAt: string
  }
  comment: {
    text: string
  }
}

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
