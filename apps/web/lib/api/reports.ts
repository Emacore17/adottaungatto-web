import type { ListingReportCreateInput } from "@workspace/validation/reports"

import { apiFetch, type ApiResult } from "@/lib/api/client"

export type ListingReportResponse = {
  created: boolean
  report: {
    id: string
    listingId: string
    moderationCaseId: string
    reasonCode: string
    description: string | null
    status: "linked"
    createdAt: string
    updatedAt: string
  }
  moderationCase: {
    id: string
    status: "open"
  }
  action: {
    id: string
  } | null
}

export function createListingReport(
  bearerToken: string,
  listingId: string,
  input: ListingReportCreateInput
): Promise<ApiResult<ListingReportResponse>> {
  return apiFetch<ListingReportResponse>(`/reports/listings/${listingId}`, {
    bearerToken,
    body: input,
    cache: "no-store",
    method: "POST",
  })
}
