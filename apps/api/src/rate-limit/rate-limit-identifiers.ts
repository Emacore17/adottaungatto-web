import type { RateLimitRule } from "./rate-limit.service.js"

export type RateLimitRequest = {
  ip?: string
  socket?: {
    remoteAddress?: string | null
  }
}

export function createRateLimitRule(
  namespace: string,
  identifier: string,
  limit: number,
  windowSeconds: number
): RateLimitRule {
  return {
    identifier,
    limit,
    namespace,
    reason: `${namespace.replaceAll(":", "_")}_limit`,
    windowSeconds,
  }
}

export function clientIdentifier(request: RateLimitRequest) {
  return `ip:${normalizeAddress(request.ip) ?? normalizeAddress(request.socket?.remoteAddress) ?? "unknown"}`
}

export function emailIdentifier(email: string) {
  return `email:${email.trim().toLowerCase()}`
}

export function tokenIdentifier(token: string) {
  return `token:${token.trim()}`
}

export function userIdentifier(userId: string) {
  return `user:${userId}`
}

export function resourceIdentifier(resourceType: string, id: string) {
  return `${resourceType}:${id}`
}

function normalizeAddress(address: string | null | undefined) {
  const trimmed = address?.trim()

  return trimmed ? trimmed : undefined
}
