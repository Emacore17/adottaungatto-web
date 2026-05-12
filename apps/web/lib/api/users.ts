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
  roles: string[]
  notificationPreferences: CurrentUserNotificationPreferences
  createdAt: string
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
