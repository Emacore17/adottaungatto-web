import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common"
import type { UserProfileUpdateInput } from "@workspace/validation"

import type { AuthUserProfileType, AuthUserStatus } from "../auth/auth.types.js"
import { DatabaseService } from "../database/database.service.js"
import type { CurrentUserProfile } from "./users.types.js"

type CurrentUserProfileRow = {
  id: string
  email: string
  email_verified_at: Date | string | null
  display_name: string
  profile_type: AuthUserProfileType
  status: AuthUserStatus
  phone_e164: string | null
  phone_verified_at: Date | string | null
  roles: string[]
  created_at: Date | string
}

const privilegedProfileRoles = new Set([
  "admin",
  "moderator",
  "professional_user",
])

const currentUserProfileSql = `
  select
    users.id::text,
    users.email,
    users.email_verified_at,
    users.display_name,
    users.profile_type::text as profile_type,
    users.status::text as status,
    users.phone_e164,
    users.phone_verified_at,
    coalesce(
      array_agg(roles.code order by roles.code)
        filter (where roles.code is not null),
      array[]::text[]
    ) as roles,
    users.created_at
  from users
  left join user_roles on user_roles.user_id = users.id
  left join roles on roles.id = user_roles.role_id
  where users.id = $1::uuid
    and users.deleted_at is null
  group by users.id
  limit 1
`

const updateCurrentUserProfileSql = `
  update users
  set
    display_name = coalesce($2::text, display_name),
    phone_e164 = case
      when $3::boolean then $4::text
      else phone_e164
    end,
    phone_verified_at = case
      when $3::boolean and $4::text is distinct from phone_e164 then null
      else phone_verified_at
    end,
    profile_type = coalesce($5::profile_type, profile_type),
    updated_at = now()
  where id = $1::uuid
    and deleted_at is null
  returning id::text
`

@Injectable()
export class UsersService {
  constructor(
    @Inject(DatabaseService)
    private readonly databaseService: DatabaseService
  ) {}

  async currentProfile(userId: string): Promise<CurrentUserProfile> {
    const [row] = await this.databaseService.queryRows<CurrentUserProfileRow>(
      currentUserProfileSql,
      [userId]
    )

    if (!row) {
      throw new NotFoundException("User profile not found.")
    }

    return mapCurrentUserProfile(row)
  }

  async updateCurrentProfile(
    userId: string,
    input: UserProfileUpdateInput
  ): Promise<CurrentUserProfile> {
    const currentProfile = await this.currentProfile(userId)

    assertCanChangeProfileType(currentProfile, input.profileType)

    const rows = await this.databaseService.queryRows<{ id: string }>(
      updateCurrentUserProfileSql,
      [
        userId,
        input.displayName ?? null,
        Object.hasOwn(input, "phoneE164"),
        input.phoneE164 ?? null,
        input.profileType ?? null,
      ]
    )

    if (rows.length === 0) {
      throw new NotFoundException("User profile not found.")
    }

    return this.currentProfile(userId)
  }
}

function mapCurrentUserProfile(row: CurrentUserProfileRow): CurrentUserProfile {
  return {
    id: row.id,
    email: row.email,
    emailVerifiedAt: toIsoStringOrNull(row.email_verified_at),
    displayName: row.display_name,
    profileType: row.profile_type,
    status: row.status,
    phoneE164: row.phone_e164,
    phoneVerifiedAt: toIsoStringOrNull(row.phone_verified_at),
    roles: row.roles,
    createdAt: toIsoString(row.created_at),
  }
}

function toIsoString(value: Date | string) {
  return new Date(value).toISOString()
}

function toIsoStringOrNull(value: Date | string | null) {
  return value === null ? null : toIsoString(value)
}

function assertCanChangeProfileType(
  currentProfile: CurrentUserProfile,
  requestedProfileType: UserProfileUpdateInput["profileType"]
) {
  if (
    requestedProfileType === undefined ||
    requestedProfileType === currentProfile.profileType ||
    requestedProfileType === "private"
  ) {
    return
  }

  if (currentProfile.roles.some((role) => privilegedProfileRoles.has(role))) {
    return
  }

  throw new ForbiddenException(
    "Profile type change requires professional verification."
  )
}
