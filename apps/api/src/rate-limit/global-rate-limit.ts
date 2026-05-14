import type { ApiEnv } from "../config/env.js"
import {
  clientIdentifier,
  createRateLimitRule,
  type RateLimitRequest,
} from "./rate-limit-identifiers.js"
import type { RateLimitRule } from "./rate-limit.service.js"

export type GlobalRateLimitRequest = RateLimitRequest

type GlobalRateLimitEnv = Pick<ApiEnv, "API_GLOBAL_RATE_LIMIT_PER_MINUTE">

const globalApiWindowSeconds = 60

export function getGlobalApiRateLimitRules(
  request: GlobalRateLimitRequest,
  env: GlobalRateLimitEnv
): RateLimitRule[] {
  return [
    createRateLimitRule(
      "api:global:ip",
      clientIdentifier(request),
      env.API_GLOBAL_RATE_LIMIT_PER_MINUTE,
      globalApiWindowSeconds
    ),
  ]
}
