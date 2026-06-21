import type { AuthUserProfileType, AuthUserStatus } from "../auth/auth.types.js"

export type CurrentUserProfile = {
  id: string
  email: string
  emailVerifiedAt: string | null
  displayName: string
  profileType: AuthUserProfileType
  status: AuthUserStatus
  phoneE164: string | null
  phoneVerifiedAt: string | null
  showPhoneOnListings: boolean
  roles: string[]
  notificationPreferences: CurrentUserNotificationPreferences
  createdAt: string
}

export type CurrentUserNotificationPreferences = {
  listingModerationDecisionEmail: boolean
  listingReportDecisionEmail: boolean
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

export type AccountExportListing = {
  id: string
  title: string
  slug: string
  lifecycleStatus: string
  moderationStatus: string
  createdAt: string
}

export type AccountExportFavorite = {
  listingId: string
  createdAt: string
}

export type AccountExportContactRequest = {
  id: string
  listingId: string
  message: string
  status: string
  createdAt: string
}

export type AccountDataExport = {
  exportedAt: string
  account: CurrentUserProfile
  listings: AccountExportListing[]
  favorites: AccountExportFavorite[]
  contactRequestsSent: AccountExportContactRequest[]
}
