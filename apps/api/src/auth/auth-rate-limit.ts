import type {
  AuthLoginInput,
  AuthRegisterInput,
  AuthRequestPasswordResetInput,
  AuthResetPasswordInput,
  AuthVerifyEmailInput,
} from "@workspace/validation"

import type { RateLimitRule } from "../rate-limit/rate-limit.service.js"

export type AuthRateLimitRequest = {
  ip?: string
  socket?: {
    remoteAddress?: string | null
  }
}

const authShortWindowSeconds = 15 * 60
const authHourWindowSeconds = 60 * 60
const authDayWindowSeconds = 24 * authHourWindowSeconds

export function getRegisterRateLimitRules(
  input: AuthRegisterInput,
  request: AuthRateLimitRequest
): RateLimitRule[] {
  return [
    createRule(
      "auth:register:ip",
      clientIdentifier(request),
      10,
      authHourWindowSeconds
    ),
    createRule(
      "auth:register:email",
      emailIdentifier(input.email),
      3,
      authDayWindowSeconds
    ),
  ]
}

export function getLoginRateLimitRules(
  input: AuthLoginInput,
  request: AuthRateLimitRequest
): RateLimitRule[] {
  return [
    createRule(
      "auth:login:ip",
      clientIdentifier(request),
      30,
      authShortWindowSeconds
    ),
    createRule(
      "auth:login:email",
      emailIdentifier(input.email),
      5,
      authShortWindowSeconds
    ),
  ]
}

export function getVerifyEmailRateLimitRules(
  input: AuthVerifyEmailInput,
  request: AuthRateLimitRequest
): RateLimitRule[] {
  return [
    createRule(
      "auth:email-verification:verify:ip",
      clientIdentifier(request),
      30,
      authShortWindowSeconds
    ),
    createRule(
      "auth:email-verification:verify:token",
      tokenIdentifier(input.token),
      10,
      authShortWindowSeconds
    ),
  ]
}

export function getRequestPasswordResetRateLimitRules(
  input: AuthRequestPasswordResetInput,
  request: AuthRateLimitRequest
): RateLimitRule[] {
  return [
    createRule(
      "auth:password-reset:request:ip",
      clientIdentifier(request),
      10,
      authHourWindowSeconds
    ),
    createRule(
      "auth:password-reset:request:email",
      emailIdentifier(input.email),
      3,
      authHourWindowSeconds
    ),
  ]
}

export function getResetPasswordRateLimitRules(
  input: AuthResetPasswordInput,
  request: AuthRateLimitRequest
): RateLimitRule[] {
  return [
    createRule(
      "auth:password-reset:confirm:ip",
      clientIdentifier(request),
      30,
      authShortWindowSeconds
    ),
    createRule(
      "auth:password-reset:confirm:token",
      tokenIdentifier(input.token),
      10,
      authShortWindowSeconds
    ),
  ]
}

export function getRequestEmailVerificationRateLimitRules(
  userId: string,
  request: AuthRateLimitRequest
): RateLimitRule[] {
  return [
    createRule(
      "auth:email-verification:request:ip",
      clientIdentifier(request),
      20,
      authHourWindowSeconds
    ),
    createRule(
      "auth:email-verification:request:user",
      userIdentifier(userId),
      3,
      authHourWindowSeconds
    ),
  ]
}

export function getChangePasswordRateLimitRules(
  userId: string,
  request: AuthRateLimitRequest
): RateLimitRule[] {
  return [
    createRule(
      "auth:password-change:ip",
      clientIdentifier(request),
      20,
      authHourWindowSeconds
    ),
    createRule(
      "auth:password-change:user",
      userIdentifier(userId),
      5,
      authHourWindowSeconds
    ),
  ]
}

function createRule(
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

function clientIdentifier(request: AuthRateLimitRequest) {
  return `ip:${normalizeAddress(request.ip) ?? normalizeAddress(request.socket?.remoteAddress) ?? "unknown"}`
}

function emailIdentifier(email: string) {
  return `email:${email.trim().toLowerCase()}`
}

function tokenIdentifier(token: string) {
  return `token:${token.trim()}`
}

function userIdentifier(userId: string) {
  return `user:${userId}`
}

function normalizeAddress(address: string | null | undefined) {
  const trimmed = address?.trim()

  return trimmed ? trimmed : undefined
}
