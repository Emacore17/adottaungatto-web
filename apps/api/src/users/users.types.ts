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
  roles: string[]
  createdAt: string
}
