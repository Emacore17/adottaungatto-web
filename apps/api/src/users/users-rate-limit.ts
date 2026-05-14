import type { RateLimitRule } from "../rate-limit/rate-limit.service.js"
import {
  clientIdentifier,
  createRateLimitRule,
  type RateLimitRequest,
  userIdentifier,
} from "../rate-limit/rate-limit-identifiers.js"

export type UsersRateLimitRequest = RateLimitRequest

const shortWindowSeconds = 15 * 60
const hourWindowSeconds = 60 * 60

export function getRequestPhoneVerificationRateLimitRules(
  userId: string,
  request: UsersRateLimitRequest
): RateLimitRule[] {
  return [
    createRateLimitRule(
      "users:phone-verification:request:ip",
      clientIdentifier(request),
      20,
      hourWindowSeconds
    ),
    createRateLimitRule(
      "users:phone-verification:request:user",
      userIdentifier(userId),
      3,
      hourWindowSeconds
    ),
  ]
}

export function getConfirmPhoneVerificationRateLimitRules(
  userId: string,
  request: UsersRateLimitRequest
): RateLimitRule[] {
  return [
    createRateLimitRule(
      "users:phone-verification:confirm:ip",
      clientIdentifier(request),
      30,
      shortWindowSeconds
    ),
    createRateLimitRule(
      "users:phone-verification:confirm:user",
      userIdentifier(userId),
      10,
      shortWindowSeconds
    ),
  ]
}

export function getAccountDangerZoneRateLimitRules(
  userId: string,
  request: UsersRateLimitRequest
): RateLimitRule[] {
  return [
    createRateLimitRule(
      "users:account-danger:ip",
      clientIdentifier(request),
      10,
      hourWindowSeconds
    ),
    createRateLimitRule(
      "users:account-danger:user",
      userIdentifier(userId),
      5,
      hourWindowSeconds
    ),
  ]
}
