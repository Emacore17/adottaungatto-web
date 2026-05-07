export type AuthUserProfileType =
  | "private"
  | "professional"
  | "association"
  | "shelter"
  | "breeder"

export type AuthUserStatus =
  | "active"
  | "pending_verification"
  | "suspended"
  | "deleted"

export type AuthUser = {
  id: string
  email: string
  displayName: string
  profileType: AuthUserProfileType
  status: AuthUserStatus
}

export type AuthSession = {
  id: string
  expiresAt: string
}

export type AuthSessionWithToken = AuthSession & {
  token: string
}

export type AuthSessionResponse = {
  user: AuthUser
  session: AuthSessionWithToken
}

export type EmailVerificationRequestResponse = {
  alreadyVerified: boolean
  expiresAt: string | null
  sent: boolean
}

export type EmailVerificationVerifyResponse = {
  emailVerifiedAt: string
  user: AuthUser
  verified: boolean
}

export type PasswordResetRequestResponse = {
  sent: boolean
}

export type PasswordResetResponse = {
  reset: boolean
}

export type PasswordChangeResponse = {
  changed: boolean
  session: AuthSessionWithToken
}

export type CurrentAuthSessionResponse = {
  user: AuthUser
  session: AuthSession
}

export type LogoutResponse = {
  revoked: boolean
}
