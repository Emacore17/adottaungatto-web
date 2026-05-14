import type {
  UserNotificationPreferencesUpdateInput,
  UserProfileUpdateInput,
} from "@workspace/validation/users"

import { apiFetch, type ApiResult } from "@/lib/api/client"

export type CurrentUserNotificationPreferences = {
  listingModerationDecisionEmail: boolean
  listingReportDecisionEmail: boolean
}

export type CurrentUserProfile = {
  id: string
  email: string
  emailVerifiedAt: string | null
  displayName: string
  profileType: string
  status: string
  phoneE164: string | null
  phoneVerifiedAt: string | null
  showPhoneOnListings: boolean
  roles: string[]
  notificationPreferences: CurrentUserNotificationPreferences
  createdAt: string
}

export type PhoneVerificationRequestResponse = {
  alreadyVerified: boolean
  expiresAt: string | null
  sent: boolean
  devCode?: string
}

export type PhoneVerificationConfirmResponse = {
  phoneVerifiedAt: string
  verified: boolean
}

export type AccountDeactivationResponse = {
  deactivated: true
}

export type AccountDeletionResponse = {
  deleted: true
}

export function getCurrentUserProfile(
  bearerToken: string
): Promise<ApiResult<CurrentUserProfile>> {
  return apiFetch<CurrentUserProfile>("/users/me", {
    bearerToken,
    cache: "no-store",
  })
}

export function updateCurrentUserProfile(
  bearerToken: string,
  input: UserProfileUpdateInput
): Promise<ApiResult<CurrentUserProfile>> {
  return apiFetch<CurrentUserProfile>("/users/me", {
    bearerToken,
    body: input,
    cache: "no-store",
    method: "PATCH",
  })
}

export function updateCurrentUserNotificationPreferences(
  bearerToken: string,
  input: UserNotificationPreferencesUpdateInput
): Promise<ApiResult<CurrentUserNotificationPreferences>> {
  return apiFetch<CurrentUserNotificationPreferences>(
    "/users/me/notification-preferences",
    {
      bearerToken,
      body: input,
      cache: "no-store",
      method: "PATCH",
    }
  )
}

export function requestCurrentUserPhoneVerification(
  bearerToken: string
): Promise<ApiResult<PhoneVerificationRequestResponse>> {
  return apiFetch<PhoneVerificationRequestResponse>(
    "/users/me/phone-verification/request",
    {
      bearerToken,
      cache: "no-store",
      method: "POST",
    }
  )
}

export function confirmCurrentUserPhoneVerification(
  bearerToken: string,
  input: { code: string }
): Promise<ApiResult<PhoneVerificationConfirmResponse>> {
  return apiFetch<PhoneVerificationConfirmResponse>(
    "/users/me/phone-verification/confirm",
    {
      bearerToken,
      body: input,
      cache: "no-store",
      method: "POST",
    }
  )
}

export function deactivateCurrentUserAccount(
  bearerToken: string,
  input: { password: string }
): Promise<ApiResult<AccountDeactivationResponse>> {
  return apiFetch<AccountDeactivationResponse>("/users/me/deactivate", {
    bearerToken,
    body: input,
    cache: "no-store",
    method: "POST",
  })
}

export function deleteCurrentUserAccount(
  bearerToken: string,
  input: { password: string }
): Promise<ApiResult<AccountDeletionResponse>> {
  return apiFetch<AccountDeletionResponse>("/users/me", {
    bearerToken,
    body: input,
    cache: "no-store",
    method: "DELETE",
  })
}
