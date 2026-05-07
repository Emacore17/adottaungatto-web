export type ListingReport = {
  id: string
  listingId: string
  moderationCaseId: string
  reasonCode: string
  description: string | null
  status: "linked"
  createdAt: string
  updatedAt: string
}

export type ListingReportResponse = {
  created: boolean
  report: ListingReport
  moderationCase: {
    id: string
    status: "open"
  }
  action: {
    id: string
  } | null
}
