import type {
  ModerationQueueItem,
  ReportedListingQueueItem,
} from "@/lib/api/moderation"

type ModerationStatus =
  | ModerationQueueItem["listing"]["moderationStatus"]
  | ReportedListingQueueItem["listing"]["moderationStatus"]

const moderationStatusLabels = {
  approved: "Approvato",
  draft: "Bozza",
  pending_review: "In revisione",
  rejected: "Rifiutato",
  suspended: "Sospeso",
} satisfies Record<ModerationStatus, string>

export function formatModerationStatus(status: ModerationStatus) {
  return moderationStatusLabels[status]
}
