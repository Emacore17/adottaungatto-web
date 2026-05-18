import type { RateLimitRule } from "../rate-limit/rate-limit.service.js"
import {
  clientIdentifier,
  createRateLimitRule,
  resourceIdentifier,
  type RateLimitRequest,
  userIdentifier,
} from "../rate-limit/rate-limit-identifiers.js"

export type ReportsRateLimitRequest = RateLimitRequest

const reportMinuteWindowSeconds = 60
const reportHourWindowSeconds = 60 * 60

export function getListingReportRateLimitRules(
  userId: string,
  listingId: string,
  request: ReportsRateLimitRequest
): RateLimitRule[] {
  return [
    createRateLimitRule(
      "reports:listing:ip",
      clientIdentifier(request),
      20,
      reportMinuteWindowSeconds
    ),
    createRateLimitRule(
      "reports:listing:user",
      userIdentifier(userId),
      12,
      reportHourWindowSeconds
    ),
    createRateLimitRule(
      "reports:listing:target",
      resourceIdentifier("listing", listingId),
      60,
      reportHourWindowSeconds
    ),
  ]
}
