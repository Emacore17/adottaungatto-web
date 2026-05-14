import type { RateLimitRule } from "../rate-limit/rate-limit.service.js"
import {
  clientIdentifier,
  createRateLimitRule,
  resourceIdentifier,
  type RateLimitRequest,
  userIdentifier,
} from "../rate-limit/rate-limit-identifiers.js"

export type ModerationRateLimitRequest = RateLimitRequest

const moderationMinuteWindowSeconds = 60
const moderationDecisionWindowSeconds = 15 * 60
const moderationClaimWindowSeconds = 15 * 60
const moderationCommentWindowSeconds = 15 * 60

export function getModerationQueueRateLimitRules(
  userId: string,
  queue: "pending-review" | "recent-actions" | "reported",
  request: ModerationRateLimitRequest
): RateLimitRule[] {
  return [
    createRateLimitRule(
      "moderation:queue:ip",
      clientIdentifier(request),
      300,
      moderationMinuteWindowSeconds
    ),
    createRateLimitRule(
      `moderation:queue:${queue}:user`,
      userIdentifier(userId),
      120,
      moderationMinuteWindowSeconds
    ),
  ]
}

export function getModerationDecisionRateLimitRules(
  userId: string,
  caseId: string,
  action: "approve" | "reject" | "suspend",
  request: ModerationRateLimitRequest
): RateLimitRule[] {
  return [
    createRateLimitRule(
      "moderation:decision:ip",
      clientIdentifier(request),
      120,
      moderationDecisionWindowSeconds
    ),
    createRateLimitRule(
      `moderation:decision:${action}:user`,
      userIdentifier(userId),
      60,
      moderationDecisionWindowSeconds
    ),
    createRateLimitRule(
      "moderation:decision:case",
      resourceIdentifier("case", caseId),
      10,
      moderationDecisionWindowSeconds
    ),
  ]
}

export function getModerationClaimRateLimitRules(
  userId: string,
  caseId: string,
  request: ModerationRateLimitRequest
): RateLimitRule[] {
  return [
    createRateLimitRule(
      "moderation:claim:ip",
      clientIdentifier(request),
      180,
      moderationClaimWindowSeconds
    ),
    createRateLimitRule(
      "moderation:claim:user",
      userIdentifier(userId),
      100,
      moderationClaimWindowSeconds
    ),
    createRateLimitRule(
      "moderation:claim:case",
      resourceIdentifier("case", caseId),
      20,
      moderationClaimWindowSeconds
    ),
  ]
}

export function getModerationCommentRateLimitRules(
  userId: string,
  caseId: string,
  request: ModerationRateLimitRequest
): RateLimitRule[] {
  return [
    createRateLimitRule(
      "moderation:comment:ip",
      clientIdentifier(request),
      180,
      moderationCommentWindowSeconds
    ),
    createRateLimitRule(
      "moderation:comment:user",
      userIdentifier(userId),
      120,
      moderationCommentWindowSeconds
    ),
    createRateLimitRule(
      "moderation:comment:case",
      resourceIdentifier("case", caseId),
      50,
      moderationCommentWindowSeconds
    ),
  ]
}
