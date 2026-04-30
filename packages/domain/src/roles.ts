export const roleCodes = [
  "registered_user",
  "professional_user",
  "moderator",
  "admin",
] as const

export type RoleCode = (typeof roleCodes)[number]

export const permissions = [
  "listing:create",
  "listing:update:own",
  "listing:submit_review:own",
  "listing:moderate",
  "report:create",
  "report:manage",
  "user:manage",
  "config:manage",
] as const

export type Permission = (typeof permissions)[number]
