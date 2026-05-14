import { randomInt } from "node:crypto"

import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common"
import type {
  UserAccountPasswordConfirmationInput,
  UserNotificationPreferencesUpdateInput,
  UserPhoneVerificationConfirmInput,
  UserProfileUpdateInput,
} from "@workspace/validation"

import type { AuthUserProfileType, AuthUserStatus } from "../auth/auth.types.js"
import { hashPassword, verifyPassword } from "../auth/auth.service.js"
import { API_ENV } from "../config/config.module.js"
import type { ApiEnv } from "../config/env.js"
import { DatabaseService } from "../database/database.service.js"
import type {
  AccountDeactivationResponse,
  AccountDeletionResponse,
  CurrentUserNotificationPreferences,
  CurrentUserProfile,
  PhoneVerificationConfirmResponse,
  PhoneVerificationRequestResponse,
} from "./users.types.js"

type UsersEnv = Pick<ApiEnv, "APP_ENV" | "PHONE_VERIFICATION_TTL_MINUTES">

const defaultUsersEnv: UsersEnv = {
  APP_ENV: "local",
  PHONE_VERIFICATION_TTL_MINUTES: 10,
}

type CurrentUserProfileRow = {
  id: string
  email: string
  email_verified_at: Date | string | null
  display_name: string
  profile_type: AuthUserProfileType
  status: AuthUserStatus
  phone_e164: string | null
  phone_verified_at: Date | string | null
  show_phone_on_listings: boolean
  roles: string[]
  listing_moderation_decision_email_enabled: boolean
  listing_report_decision_email_enabled: boolean
  created_at: Date | string
}

type UserNotificationPreferencesRow = {
  user_id: string
  listing_moderation_decision_email_enabled: boolean
  listing_report_decision_email_enabled: boolean
}

type UserNotificationPreferencesFields = Pick<
  UserNotificationPreferencesRow,
  | "listing_moderation_decision_email_enabled"
  | "listing_report_decision_email_enabled"
>

type PhoneVerificationRequestRow = {
  phone_e164: string | null
  phone_verified_at: Date | string | null
  code_id: string | null
  expires_at: Date | string | null
}

type PhoneVerificationCodeRow = {
  id: string
  phone_e164: string
  code_hash: string
}

type PhoneVerificationConfirmRow = {
  phone_verified_at: Date | string
}

type UserPasswordRow = {
  id: string
  password_hash: string | null
}

type AccountStateChangeRow = {
  id: string
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
    users.show_phone_on_listings,
    coalesce(
      array_agg(roles.code order by roles.code)
        filter (where roles.code is not null),
      array[]::text[]
    ) as roles,
    coalesce(
      bool_or(
        notification_preferences.listing_moderation_decision_email_enabled
      ),
      true
    ) as listing_moderation_decision_email_enabled,
    coalesce(
      bool_or(notification_preferences.listing_report_decision_email_enabled),
      true
    ) as listing_report_decision_email_enabled,
    users.created_at
  from users
  left join user_roles on user_roles.user_id = users.id
  left join roles on roles.id = user_roles.role_id
  left join user_notification_preferences notification_preferences
    on notification_preferences.user_id = users.id
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
    show_phone_on_listings = coalesce($5::boolean, show_phone_on_listings),
    profile_type = coalesce($6::profile_type, profile_type),
    updated_at = now()
  where id = $1::uuid
    and deleted_at is null
  returning id::text
`

const currentUserNotificationPreferencesSql = `
  select
    users.id::text as user_id,
    coalesce(
      notification_preferences.listing_moderation_decision_email_enabled,
      true
    ) as listing_moderation_decision_email_enabled,
    coalesce(
      notification_preferences.listing_report_decision_email_enabled,
      true
    ) as listing_report_decision_email_enabled
  from users
  left join user_notification_preferences notification_preferences
    on notification_preferences.user_id = users.id
  where users.id = $1::uuid
    and users.deleted_at is null
  limit 1
`

const upsertCurrentUserNotificationPreferencesSql = `
  insert into user_notification_preferences (
    user_id,
    listing_moderation_decision_email_enabled,
    listing_report_decision_email_enabled
  )
  select
    users.id,
    coalesce($2::boolean, true),
    coalesce($3::boolean, true)
  from users
  where users.id = $1::uuid
    and users.deleted_at is null
  on conflict (user_id) do update
  set
    listing_moderation_decision_email_enabled = coalesce(
      $2::boolean,
      user_notification_preferences.listing_moderation_decision_email_enabled
    ),
    listing_report_decision_email_enabled = coalesce(
      $3::boolean,
      user_notification_preferences.listing_report_decision_email_enabled
    ),
    updated_at = now()
  returning
    user_id::text,
    listing_moderation_decision_email_enabled,
    listing_report_decision_email_enabled
`

const createPhoneVerificationCodeSql = `
  with target_user as (
    select id, phone_e164, phone_verified_at
    from users
    where id = $1::uuid
      and deleted_at is null
    limit 1
  ),
  consumed_existing as (
    update phone_verification_codes
    set consumed_at = now(),
        updated_at = now()
    where user_id = (select id from target_user)
      and consumed_at is null
    returning id
  ),
  inserted_code as (
    insert into phone_verification_codes (
      user_id,
      phone_e164,
      code_hash,
      expires_at
    )
    select target_user.id, target_user.phone_e164, $2, $3
    from target_user
    where target_user.phone_e164 is not null
      and target_user.phone_verified_at is null
    returning id::text as code_id, expires_at
  )
  select
    target_user.phone_e164,
    target_user.phone_verified_at,
    inserted_code.code_id,
    inserted_code.expires_at
  from target_user
  left join inserted_code on true
`

const activePhoneVerificationCodeSql = `
  select id::text, phone_e164, code_hash
  from phone_verification_codes
  where user_id = $1::uuid
    and consumed_at is null
    and expires_at > now()
  order by created_at desc
  limit 1
`

const confirmPhoneVerificationCodeSql = `
  with consumed_code as (
    update phone_verification_codes
    set consumed_at = now(),
        updated_at = now()
    where id = $2::uuid
      and user_id = $1::uuid
      and consumed_at is null
      and expires_at > now()
    returning phone_e164
  ),
  updated_user as (
    update users
    set phone_verified_at = now(),
        updated_at = now()
    from consumed_code
    where users.id = $1::uuid
      and users.phone_e164 = consumed_code.phone_e164
      and users.deleted_at is null
    returning users.phone_verified_at
  )
  select phone_verified_at
  from updated_user
`

const currentUserPasswordSql = `
  select id::text, password_hash
  from users
  where id = $1::uuid
    and deleted_at is null
  limit 1
`

const deactivateCurrentAccountSql = `
  with updated_user as (
    update users
    set status = 'suspended'::user_status,
        updated_at = now()
    where id = $1::uuid
      and deleted_at is null
      and status <> 'deleted'
    returning id
  ),
  revoked_sessions as (
    update sessions
    set revoked_at = now()
    where user_id in (select id from updated_user)
      and revoked_at is null
    returning id
  )
  select id::text
  from updated_user
`

const deleteCurrentAccountSql = `
  with updated_user as (
    update users
    set email = concat('deleted+', id::text, '@adottaungatto.invalid'),
        email_normalized = concat('deleted+', id::text, '@adottaungatto.invalid'),
        password_hash = null,
        email_verified_at = null,
        phone_e164 = null,
        phone_verified_at = null,
        display_name = 'Account eliminato',
        status = 'deleted'::user_status,
        deleted_at = now(),
        updated_at = now()
    where id = $1::uuid
      and deleted_at is null
    returning id
  ),
  revoked_sessions as (
    update sessions
    set revoked_at = now()
    where user_id in (select id from updated_user)
      and revoked_at is null
    returning id
  )
  select id::text
  from updated_user
`

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name)

  constructor(
    @Inject(DatabaseService)
    private readonly databaseService: DatabaseService,
    @Inject(API_ENV)
    private readonly env: UsersEnv = defaultUsersEnv
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
        input.showPhoneOnListings ?? null,
        input.profileType ?? null,
      ]
    )

    if (rows.length === 0) {
      throw new NotFoundException("User profile not found.")
    }

    return this.currentProfile(userId)
  }

  async currentNotificationPreferences(
    userId: string
  ): Promise<CurrentUserNotificationPreferences> {
    const [row] =
      await this.databaseService.queryRows<UserNotificationPreferencesRow>(
        currentUserNotificationPreferencesSql,
        [userId]
      )

    if (!row) {
      throw new NotFoundException("User profile not found.")
    }

    return mapNotificationPreferences(row)
  }

  async updateCurrentNotificationPreferences(
    userId: string,
    input: UserNotificationPreferencesUpdateInput
  ): Promise<CurrentUserNotificationPreferences> {
    const [row] =
      await this.databaseService.queryRows<UserNotificationPreferencesRow>(
        upsertCurrentUserNotificationPreferencesSql,
        [
          userId,
          input.listingModerationDecisionEmail ?? null,
          input.listingReportDecisionEmail ?? null,
        ]
      )

    if (!row) {
      throw new NotFoundException("User profile not found.")
    }

    return mapNotificationPreferences(row)
  }

  async requestPhoneVerification(
    userId: string
  ): Promise<PhoneVerificationRequestResponse> {
    const code = createPhoneVerificationCode()
    const expiresAt = new Date(
      Date.now() + this.env.PHONE_VERIFICATION_TTL_MINUTES * 60 * 1000
    ).toISOString()
    const [row] =
      await this.databaseService.queryRows<PhoneVerificationRequestRow>(
        createPhoneVerificationCodeSql,
        [userId, await hashPassword(code), expiresAt]
      )

    if (!row) {
      throw new NotFoundException("User profile not found.")
    }

    if (!row.phone_e164) {
      throw new BadRequestException("Phone number is required.")
    }

    if (!row.code_id || !row.expires_at) {
      return {
        alreadyVerified: true,
        expiresAt: null,
        sent: false,
      }
    }

    await this.sendPhoneVerificationCode(row.phone_e164, code)

    return {
      alreadyVerified: false,
      devCode: canExposePhoneVerificationCode(this.env) ? code : undefined,
      expiresAt: toIsoString(row.expires_at),
      sent: true,
    }
  }

  async confirmPhoneVerification(
    userId: string,
    input: UserPhoneVerificationConfirmInput
  ): Promise<PhoneVerificationConfirmResponse> {
    const [codeRow] =
      await this.databaseService.queryRows<PhoneVerificationCodeRow>(
        activePhoneVerificationCodeSql,
        [userId]
      )

    if (!codeRow) {
      throw new BadRequestException(
        "Invalid or expired phone verification code."
      )
    }

    const codeMatches = await verifyPassword(input.code, codeRow.code_hash)

    if (!codeMatches) {
      throw new BadRequestException(
        "Invalid or expired phone verification code."
      )
    }

    const [row] =
      await this.databaseService.queryRows<PhoneVerificationConfirmRow>(
        confirmPhoneVerificationCodeSql,
        [userId, codeRow.id]
      )

    if (!row) {
      throw new BadRequestException("Phone number changed before verification.")
    }

    return {
      phoneVerifiedAt: toIsoString(row.phone_verified_at),
      verified: true,
    }
  }

  async deactivateCurrentAccount(
    userId: string,
    input: UserAccountPasswordConfirmationInput
  ): Promise<AccountDeactivationResponse> {
    await this.assertPasswordConfirmation(userId, input.password)

    const rows = await this.databaseService.queryRows<AccountStateChangeRow>(
      deactivateCurrentAccountSql,
      [userId]
    )

    if (rows.length === 0) {
      throw new NotFoundException("User profile not found.")
    }

    return { deactivated: true }
  }

  async deleteCurrentAccount(
    userId: string,
    input: UserAccountPasswordConfirmationInput
  ): Promise<AccountDeletionResponse> {
    await this.assertPasswordConfirmation(userId, input.password)

    const rows = await this.databaseService.queryRows<AccountStateChangeRow>(
      deleteCurrentAccountSql,
      [userId]
    )

    if (rows.length === 0) {
      throw new NotFoundException("User profile not found.")
    }

    return { deleted: true }
  }

  private async assertPasswordConfirmation(userId: string, password: string) {
    const [user] = await this.databaseService.queryRows<UserPasswordRow>(
      currentUserPasswordSql,
      [userId]
    )

    if (!user) {
      throw new NotFoundException("User profile not found.")
    }

    if (!user.password_hash) {
      throw new BadRequestException("User account does not have a password.")
    }

    const passwordMatches = await verifyPassword(password, user.password_hash)

    if (!passwordMatches) {
      throw new UnauthorizedException("Invalid password.")
    }
  }

  private async sendPhoneVerificationCode(phoneE164: string, code: string) {
    if (!canExposePhoneVerificationCode(this.env)) {
      throw new ServiceUnavailableException(
        "Phone verification SMS provider is not configured."
      )
    }

    if (this.env.APP_ENV === "local" && process.env.NODE_ENV !== "test") {
      this.logger.log(`Phone verification code for ${phoneE164}: ${code}`)
    }
  }
}

function createPhoneVerificationCode() {
  return randomInt(0, 1_000_000).toString().padStart(6, "0")
}

function canExposePhoneVerificationCode(env: UsersEnv) {
  return env.APP_ENV === "local" || env.APP_ENV === "test"
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
    showPhoneOnListings: row.show_phone_on_listings,
    roles: row.roles,
    notificationPreferences: mapNotificationPreferences(row),
    createdAt: toIsoString(row.created_at),
  }
}

function mapNotificationPreferences(
  row: UserNotificationPreferencesFields
): CurrentUserNotificationPreferences {
  return {
    listingModerationDecisionEmail:
      row.listing_moderation_decision_email_enabled,
    listingReportDecisionEmail: row.listing_report_decision_email_enabled,
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
