export type NotificationType =
  | "listing_moderation_decision"
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
  meta: {
    page: number
    pageSize: number
    total: number
    totalPages: number
    unreadCount: number
  }
}

export type NotificationUnreadCountResponse = {
  unreadCount: number
}

export type NotificationMarkAllReadResponse = {
  updatedCount: number
}

export type ListingModerationDecisionNotificationPayload = {
  caseId: string
  decision: "approved" | "rejected" | "suspended"
  listingId: string
  listingSlug: string
  listingTitle: string
  reasonCode: string | null
  reasonText: string | null
}

export type ListingReportDecisionNotificationPayload =
  ListingModerationDecisionNotificationPayload & {
    reportId: string
    reportResolutionStatus: "resolved" | "dismissed"
  }
