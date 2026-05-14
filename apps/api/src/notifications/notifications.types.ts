export type NotificationType =
  | "listing_moderation_decision"
  | "listing_review_submission"
  | "listing_contact_request"
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

export type NotificationDeleteResponse = {
  deleted: true
  notificationId: string
}

export type NotificationRealtimeEvent =
  | {
      type: "snapshot"
      data: NotificationUnreadCountResponse
    }
  | {
      type: "created"
      data: NotificationUnreadCountResponse & {
        notification: Notification
      }
    }
  | {
      type: "read"
      data: NotificationUnreadCountResponse & {
        notification: Notification
        notificationId: string
      }
    }
  | {
      type: "read_all"
      data: NotificationUnreadCountResponse & NotificationMarkAllReadResponse
    }
  | {
      type: "deleted"
      data: NotificationUnreadCountResponse & {
        notificationId: string
      }
    }
  | {
      type: "ping"
      data: {
        at: string
      }
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

export type ListingReviewSubmissionNotificationPayload = {
  listingId: string
  listingSlug: string
  listingTitle: string
  moderationStatus: "pending_review"
}

export type ListingContactRequestNotificationPayload = {
  contactRequestId: string
  emailShared: boolean
  listingId: string
  listingTitle: string
  phoneShared: boolean
  requesterDisplayName: string
  requesterUserId: string
  status: "sent"
}
