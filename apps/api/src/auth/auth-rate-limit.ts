import type {
  AuthLoginInput,
  AuthRegisterInput,
  AuthRequestPasswordResetInput,
  AuthResetPasswordInput,
  AuthVerifyEmailInput,
} from "@workspace/validation"

import type { RateLimitRule } from "../rate-limit/rate-limit.service.js"
import {
  clientIdentifier,
  createRateLimitRule,
  emailIdentifier,
  tokenIdentifier,
  type RateLimitRequest,
  userIdentifier,
} from "../rate-limit/rate-limit-identifiers.js"

export type AuthRateLimitRequest = RateLimitRequest

const authShortWindowSeconds = 15 * 60
const authHourWindowSeconds = 60 * 60
const authDayWindowSeconds = 24 * authHourWindowSeconds

export function getRegisterRateLimitRules(
  input: AuthRegisterInput,
  request: AuthRateLimitRequest
): RateLimitRule[] {
  return [
    createRateLimitRule(
      "auth:register:ip",
      clientIdentifier(request),
      10,
      authHourWindowSeconds
    ),
    createRateLimitRule(
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
    createRateLimitRule(
      "auth:login:ip",
      clientIdentifier(request),
      30,
      authShortWindowSeconds
    ),
    createRateLimitRule(
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
    createRateLimitRule(
      "auth:email-verification:verify:ip",
      clientIdentifier(request),
      30,
      authShortWindowSeconds
    ),
    createRateLimitRule(
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
    createRateLimitRule(
      "auth:password-reset:request:ip",
      clientIdentifier(request),
      10,
      authHourWindowSeconds
    ),
    createRateLimitRule(
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
    createRateLimitRule(
      "auth:password-reset:confirm:ip",
      clientIdentifier(request),
      30,
      authShortWindowSeconds
    ),
    createRateLimitRule(
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
    createRateLimitRule(
      "auth:email-verification:request:ip",
      clientIdentifier(request),
      20,
      authHourWindowSeconds
    ),
    createRateLimitRule(
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
    createRateLimitRule(
      "auth:password-change:ip",
      clientIdentifier(request),
      20,
      authHourWindowSeconds
    ),
    createRateLimitRule(
      "auth:password-change:user",
      userIdentifier(userId),
      5,
      authHourWindowSeconds
    ),
  ]
}
