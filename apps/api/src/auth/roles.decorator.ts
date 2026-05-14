import { SetMetadata } from "@nestjs/common"

export const requiredRolesMetadataKey = "auth:required_roles"

export const authRoleCodes = [
  "registered_user",
  "professional_user",
  "moderator",
  "admin",
] as const

export type AuthRoleCode = (typeof authRoleCodes)[number]

export function RequireRoles(...roles: AuthRoleCode[]) {
  return SetMetadata(requiredRolesMetadataKey, roles)
}
