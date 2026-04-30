export const moderationCaseStatuses = [
  "open",
  "approved",
  "rejected",
  "suspended",
  "closed",
] as const

export type ModerationCaseStatus = (typeof moderationCaseStatuses)[number]

export const moderationActionTypes = [
  "opened",
  "assigned",
  "approved",
  "rejected",
  "suspended",
  "closed",
  "commented",
  "reported",
] as const

export type ModerationActionType = (typeof moderationActionTypes)[number]

export const reportTargetTypes = ["listing", "profile"] as const

export type ReportTargetType = (typeof reportTargetTypes)[number]

export const reportStatuses = [
  "open",
  "linked",
  "resolved",
  "dismissed",
] as const

export type ReportStatus = (typeof reportStatuses)[number]
