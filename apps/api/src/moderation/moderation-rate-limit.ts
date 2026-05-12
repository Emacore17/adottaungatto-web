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

export function getModerationQueueRateLimitRules(
  userId: string,
  queue: "pending-review" | "reported",
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
