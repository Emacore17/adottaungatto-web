import type { ModerationDecisionInput } from "@workspace/validation/moderation"
import type { PaginationQuery } from "@workspace/validation/pagination"

import { apiFetch, type ApiResult } from "@/lib/api/client"

type ModerationLocation = {
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

type ModerationImages = {
  readyCount: number
  cover: {
    id: string
    objectKeyThumb: string | null
    objectKeyLarge: string | null
  } | null
  preview: Array<{
    id: string
    objectKeyThumb: string | null
    objectKeyLarge: string | null
    isCover: boolean
    sortOrder: number
  }>
}

type ModerationQueueMeta = {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

type ModerationAudit = {
  actions: Array<{
    id: string
    action:
      | "opened"
      | "assigned"
      | "approved"
      | "rejected"
      | "suspended"
      | "closed"
      | "commented"
      | "reported"
    reasonCode: string | null
    reasonText: string | null
    fromStatus:
      | "draft"
      | "pending_review"
      | "approved"
      | "rejected"
      | "suspended"
      | null
    toStatus:
      | "draft"
      | "pending_review"
      | "approved"
      | "rejected"
      | "suspended"
      | null
    createdAt: string
    actor: {
      id: string
      email: string
      displayName: string
    } | null
  }>
}

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
  location: ModerationLocation
  images: ModerationImages
  audit: ModerationAudit
}

export type ModerationQueueResponse = {
  items: ModerationQueueItem[]
  meta: ModerationQueueMeta
}

export type ReportedListingQueueItem = {
  case: ModerationQueueItem["case"]
  listing: {
    id: string
    title: string
    slug: string
    description: string
    moderationStatus:
      | "draft"
      | "pending_review"
      | "approved"
      | "rejected"
      | "suspended"
    lifecycleStatus: "draft" | "published" | "expired" | "adopted" | "deleted"
    publishedAt: string | null
    expiresAt: string | null
    createdAt: string
    updatedAt: string
  }
  owner: ModerationQueueItem["owner"]
  location: ModerationLocation
  images: ModerationImages
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
  meta: ModerationQueueMeta
}

export type ModerationDecisionAction = "approve" | "reject" | "suspend"

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
    status: "resolved" | "dismissed"
    count: number
  }
}

export function listPendingReviewModerationQueue(
  bearerToken: string,
  query: Partial<PaginationQuery> = {}
): Promise<ApiResult<ModerationQueueResponse>> {
  const params = createPaginationParams(query)
  const queryString = params.toString()

  return apiFetch<ModerationQueueResponse>(
    `/moderation/listings/pending-review${queryString ? `?${queryString}` : ""}`,
    {
      bearerToken,
      cache: "no-store",
    }
  )
}

export function listReportedListingsModerationQueue(
  bearerToken: string,
  query: Partial<PaginationQuery> = {}
): Promise<ApiResult<ReportedListingQueueResponse>> {
  const params = createPaginationParams(query)
  const queryString = params.toString()

  return apiFetch<ReportedListingQueueResponse>(
    `/moderation/listings/reported${queryString ? `?${queryString}` : ""}`,
    {
      bearerToken,
      cache: "no-store",
    }
  )
}

export function decideModerationListingCase(
  bearerToken: string,
  caseId: string,
  action: ModerationDecisionAction,
  input: ModerationDecisionInput
): Promise<ApiResult<ModerationDecisionResponse>> {
  return apiFetch<ModerationDecisionResponse>(
    `/moderation/listings/cases/${caseId}/${action}`,
    {
      bearerToken,
      body: input,
      cache: "no-store",
      method: "POST",
    }
  )
}

function createPaginationParams(query: Partial<PaginationQuery>) {
  const params = new URLSearchParams()

  if (query.page !== undefined) {
    params.set("page", String(query.page))
  }

  if (query.pageSize !== undefined) {
    params.set("pageSize", String(query.pageSize))
  }

  return params
}
