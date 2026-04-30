import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto"

import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common"
import type {
  AuthLoginInput,
  AuthRegisterInput,
  AuthRequestPasswordResetInput,
  AuthResetPasswordInput,
  AuthVerifyEmailInput,
} from "@workspace/validation"

import { API_ENV } from "../config/config.module.js"
import type { ApiEnv } from "../config/env.js"
import { DatabaseService } from "../database/database.service.js"
import { MailService } from "../mail/mail.service.js"
import type {
  AuthSessionResponse,
  AuthUser,
  AuthUserProfileType,
  AuthUserStatus,
  CurrentAuthSessionResponse,
  EmailVerificationRequestResponse,
  EmailVerificationVerifyResponse,
  LogoutResponse,
  PasswordResetRequestResponse,
  PasswordResetResponse,
} from "./auth.types.js"

const passwordKeyLength = 64
const scryptOptions = {
  N: 16384,
  r: 8,
  p: 1,
  maxmem: 64 * 1024 * 1024,
}
const sessionTtlMs = 30 * 24 * 60 * 60 * 1000

type AuthSessionRow = AuthUserRow & {
  session_id: string
  expires_at: Date | string
}

type AuthUserRow = {
  id: string
  email: string
  display_name: string
  profile_type: AuthUserProfileType
  status: AuthUserStatus
}

type AuthUserLookupRow = AuthUserRow & {
  password_hash: string | null
}

type SessionRow = {
  session_id: string
  expires_at: Date | string
}

type RevokedSessionRow = {
  id: string
}

type EmailVerificationRequestRow = {
  id: string
  email: string
  display_name: string
  email_verified_at: Date | string | null
  token_id: string | null
  expires_at: Date | string | null
}

type EmailVerificationVerifyRow = AuthUserRow & {
  email_verified_at: Date | string
}

type PasswordResetRequestRow = {
  id: string
  email: string
  display_name: string
  token_id: string
  expires_at: Date | string
}

type PasswordResetTokenRow = {
  id: string
}

const registerSql = `
  with inserted_user as (
    insert into users (
      email,
      email_normalized,
      password_hash,
      display_name,
      profile_type,
      status
    )
    values ($1, $2, $3, $4, $5::profile_type, 'pending_verification')
    returning
      id,
      email,
      display_name,
      profile_type::text as profile_type,
      status::text as status
  ),
  inserted_role as (
    insert into user_roles (user_id, role_id)
    select inserted_user.id, roles.id
    from inserted_user
    join roles on roles.code = 'registered_user'
    on conflict do nothing
    returning role_id
  ),
  inserted_session as (
    insert into sessions (user_id, token_hash, expires_at)
    select inserted_user.id, $6, $7
    from inserted_user
    returning id::text as session_id, expires_at
  )
  select
    inserted_user.id::text as id,
    inserted_user.email,
    inserted_user.display_name,
    inserted_user.profile_type,
    inserted_user.status,
    inserted_session.session_id,
    inserted_session.expires_at
  from inserted_user
  join inserted_session on true
  left join inserted_role on true
`

const userByEmailSql = `
  select
    id::text,
    email,
    display_name,
    profile_type::text as profile_type,
    status::text as status,
    password_hash
  from users
  where email_normalized = $1
    and deleted_at is null
  limit 1
`

const insertSessionSql = `
  insert into sessions (user_id, token_hash, expires_at)
  values ($1::uuid, $2, $3)
  returning id::text as session_id, expires_at
`

const currentSessionSql = `
  select
    users.id::text,
    users.email,
    users.display_name,
    users.profile_type::text as profile_type,
    users.status::text as status,
    sessions.id::text as session_id,
    sessions.expires_at
  from sessions
  join users on users.id = sessions.user_id
  where sessions.token_hash = $1
    and sessions.revoked_at is null
    and sessions.expires_at > now()
    and users.deleted_at is null
  limit 1
`

const logoutSql = `
  update sessions
  set revoked_at = now()
  where token_hash = $1
    and revoked_at is null
  returning id::text
`

const createEmailVerificationTokenSql = `
  with target_user as (
    select id, email, display_name, email_verified_at
    from users
    where id = $1::uuid
      and deleted_at is null
    limit 1
  ),
  consumed_existing as (
    update email_verification_tokens
    set consumed_at = now(),
        updated_at = now()
    where user_id = (select id from target_user)
      and consumed_at is null
    returning id
  ),
  inserted_token as (
    insert into email_verification_tokens (user_id, email, token_hash, expires_at)
    select target_user.id, target_user.email, $2, $3
    from target_user
    where target_user.email_verified_at is null
    returning id::text as token_id, expires_at
  )
  select
    target_user.id::text,
    target_user.email,
    target_user.display_name,
    target_user.email_verified_at,
    inserted_token.token_id,
    inserted_token.expires_at
  from target_user
  left join inserted_token on true
`

const verifyEmailSql = `
  with matched_token as (
    select id, user_id, email
    from email_verification_tokens
    where token_hash = $1
      and consumed_at is null
      and expires_at > now()
    limit 1
  ),
  consumed_token as (
    update email_verification_tokens
    set consumed_at = now(),
        updated_at = now()
    where id in (select id from matched_token)
    returning user_id, email
  ),
  updated_user as (
    update users
    set email_verified_at = coalesce(email_verified_at, now()),
        status = case
          when status = 'pending_verification' then 'active'::user_status
          else status
        end,
        updated_at = now()
    from consumed_token
    where users.id = consumed_token.user_id
      and users.email = consumed_token.email
      and users.deleted_at is null
    returning
      users.id::text,
      users.email,
      users.display_name,
      users.profile_type::text as profile_type,
      users.status::text as status,
      users.email_verified_at
  )
  select *
  from updated_user
`

const createPasswordResetTokenSql = `
  with target_user as (
    select id, email, display_name
    from users
    where email_normalized = $1
      and deleted_at is null
      and password_hash is not null
    limit 1
  ),
  consumed_existing as (
    update password_reset_tokens
    set consumed_at = now(),
        updated_at = now()
    where user_id = (select id from target_user)
      and consumed_at is null
    returning id
  ),
  inserted_token as (
    insert into password_reset_tokens (user_id, email, token_hash, expires_at)
    select target_user.id, target_user.email, $2, $3
    from target_user
    returning id::text as token_id, expires_at
  )
  select
    target_user.id::text,
    target_user.email,
    target_user.display_name,
    inserted_token.token_id,
    inserted_token.expires_at
  from target_user
  join inserted_token on true
`

const passwordResetTokenByHashSql = `
  select password_reset_tokens.id::text as id
  from password_reset_tokens
  join users on users.id = password_reset_tokens.user_id
    and users.email = password_reset_tokens.email
    and users.deleted_at is null
  where password_reset_tokens.token_hash = $1
    and password_reset_tokens.consumed_at is null
    and password_reset_tokens.expires_at > now()
  limit 1
`

const completePasswordResetSql = `
  with consumed_token as (
    update password_reset_tokens
    set consumed_at = now(),
        updated_at = now()
    where id = $1::uuid
      and token_hash = $2
      and consumed_at is null
      and expires_at > now()
    returning user_id, email
  ),
  updated_user as (
    update users
    set password_hash = $3,
        updated_at = now()
    from consumed_token
    where users.id = consumed_token.user_id
      and users.email = consumed_token.email
      and users.deleted_at is null
    returning users.id
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
export class AuthService {
  constructor(
    @Inject(DatabaseService)
    private readonly databaseService: DatabaseService,
    @Inject(MailService)
    private readonly mailService: MailService,
    @Inject(API_ENV)
    private readonly env: ApiEnv
  ) {}

  async register(input: AuthRegisterInput): Promise<AuthSessionResponse> {
    const token = createSessionToken()
    const tokenHash = hashSessionToken(token)
    const passwordHash = await hashPassword(input.password)
    const expiresAt = getSessionExpiresAt().toISOString()

    try {
      const [row] = await this.databaseService.queryRows<AuthSessionRow>(
        registerSql,
        [
          input.email,
          normalizeEmail(input.email),
          passwordHash,
          input.displayName,
          input.profileType,
          tokenHash,
          expiresAt,
        ]
      )

      if (!row) {
        throw new UnauthorizedException("Could not create user session.")
      }

      const response = mapSessionResponse(row, token)

      await this.requestEmailVerification(response.user.id)

      return response
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException("Email already registered.")
      }

      throw error
    }
  }

  async login(input: AuthLoginInput): Promise<AuthSessionResponse> {
    const [user] = await this.databaseService.queryRows<AuthUserLookupRow>(
      userByEmailSql,
      [normalizeEmail(input.email)]
    )

    if (!user?.password_hash) {
      throwInvalidCredentials()
    }

    const passwordMatches = await verifyPassword(
      input.password,
      user.password_hash
    )

    if (!passwordMatches) {
      throwInvalidCredentials()
    }

    assertUserCanAuthenticate(user)

    const token = createSessionToken()
    const [session] = await this.databaseService.queryRows<SessionRow>(
      insertSessionSql,
      [user.id, hashSessionToken(token), getSessionExpiresAt().toISOString()]
    )

    if (!session) {
      throw new UnauthorizedException("Could not create user session.")
    }

    return {
      user: mapUser(user),
      session: {
        id: session.session_id,
        token,
        expiresAt: toIsoString(session.expires_at),
      },
    }
  }

  async currentSession(token: string): Promise<CurrentAuthSessionResponse> {
    const [row] = await this.databaseService.queryRows<AuthSessionRow>(
      currentSessionSql,
      [hashSessionToken(token)]
    )

    if (!row) {
      throw new UnauthorizedException("Invalid or expired session.")
    }

    assertUserCanAuthenticate(row)

    return {
      user: mapUser(row),
      session: {
        id: row.session_id,
        expiresAt: toIsoString(row.expires_at),
      },
    }
  }

  async logout(token: string): Promise<LogoutResponse> {
    const rows = await this.databaseService.queryRows<RevokedSessionRow>(
      logoutSql,
      [hashSessionToken(token)]
    )

    return { revoked: rows.length > 0 }
  }

  async requestEmailVerification(
    userId: string
  ): Promise<EmailVerificationRequestResponse> {
    const token = createEmailVerificationToken()
    const expiresAt = getEmailVerificationExpiresAt(
      this.env.EMAIL_VERIFICATION_TTL_MINUTES
    ).toISOString()
    const [row] =
      await this.databaseService.queryRows<EmailVerificationRequestRow>(
        createEmailVerificationTokenSql,
        [userId, hashEmailVerificationToken(token), expiresAt]
      )

    if (!row) {
      throw new NotFoundException("User profile not found.")
    }

    if (!row.token_id || !row.expires_at) {
      return {
        alreadyVerified: true,
        expiresAt: null,
        sent: false,
      }
    }

    const tokenExpiresAt = toIsoString(row.expires_at)

    await this.mailService.sendEmailVerification({
      displayName: row.display_name,
      expiresAt: tokenExpiresAt,
      to: row.email,
      token,
    })

    return {
      alreadyVerified: false,
      expiresAt: tokenExpiresAt,
      sent: true,
    }
  }

  async verifyEmail(
    input: AuthVerifyEmailInput
  ): Promise<EmailVerificationVerifyResponse> {
    const [row] =
      await this.databaseService.queryRows<EmailVerificationVerifyRow>(
        verifyEmailSql,
        [hashEmailVerificationToken(input.token)]
      )

    if (!row) {
      throw new BadRequestException(
        "Invalid or expired email verification token."
      )
    }

    return {
      emailVerifiedAt: toIsoString(row.email_verified_at),
      user: mapUser(row),
      verified: true,
    }
  }

  async requestPasswordReset(
    input: AuthRequestPasswordResetInput
  ): Promise<PasswordResetRequestResponse> {
    const token = createPasswordResetToken()
    const expiresAt = getPasswordResetExpiresAt(
      this.env.PASSWORD_RESET_TTL_MINUTES
    ).toISOString()
    const [row] = await this.databaseService.queryRows<PasswordResetRequestRow>(
      createPasswordResetTokenSql,
      [normalizeEmail(input.email), hashPasswordResetToken(token), expiresAt]
    )

    if (row) {
      await this.mailService.sendPasswordReset({
        displayName: row.display_name,
        expiresAt: toIsoString(row.expires_at),
        to: row.email,
        token,
      })
    }

    return { sent: true }
  }

  async resetPassword(
    input: AuthResetPasswordInput
  ): Promise<PasswordResetResponse> {
    const tokenHash = hashPasswordResetToken(input.token)
    const [tokenRow] =
      await this.databaseService.queryRows<PasswordResetTokenRow>(
        passwordResetTokenByHashSql,
        [tokenHash]
      )

    if (!tokenRow) {
      throw new BadRequestException("Invalid or expired password reset token.")
    }

    const passwordHash = await hashPassword(input.password)
    const rows = await this.databaseService.queryRows<{ id: string }>(
      completePasswordResetSql,
      [tokenRow.id, tokenHash, passwordHash]
    )

    if (rows.length === 0) {
      throw new BadRequestException("Invalid or expired password reset token.")
    }

    return { reset: true }
  }
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16)
  const key = await deriveScryptKey(
    password,
    salt,
    passwordKeyLength,
    scryptOptions
  )

  return [
    "scrypt",
    `N=${scryptOptions.N},r=${scryptOptions.r},p=${scryptOptions.p}`,
    salt.toString("base64url"),
    key.toString("base64url"),
  ].join("$")
}

export async function verifyPassword(
  password: string,
  passwordHash: string
): Promise<boolean> {
  const parsed = parsePasswordHash(passwordHash)

  if (!parsed) {
    return false
  }

  const candidate = await deriveScryptKey(
    password,
    parsed.salt,
    parsed.key.length,
    parsed.options
  )

  return (
    candidate.length === parsed.key.length &&
    timingSafeEqual(candidate, parsed.key)
  )
}

export function createSessionToken(): string {
  return randomBytes(32).toString("base64url")
}

export function createEmailVerificationToken(): string {
  return randomBytes(32).toString("base64url")
}

export function createPasswordResetToken(): string {
  return randomBytes(32).toString("base64url")
}

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex")
}

export function hashEmailVerificationToken(token: string): string {
  return createHash("sha256").update(token).digest("hex")
}

export function hashPasswordResetToken(token: string): string {
  return createHash("sha256").update(token).digest("hex")
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

function getSessionExpiresAt() {
  return new Date(Date.now() + sessionTtlMs)
}

function getEmailVerificationExpiresAt(ttlMinutes: number) {
  return new Date(Date.now() + ttlMinutes * 60 * 1000)
}

function getPasswordResetExpiresAt(ttlMinutes: number) {
  return new Date(Date.now() + ttlMinutes * 60 * 1000)
}

function mapSessionResponse(
  row: AuthSessionRow,
  token: string
): AuthSessionResponse {
  return {
    user: mapUser(row),
    session: {
      id: row.session_id,
      token,
      expiresAt: toIsoString(row.expires_at),
    },
  }
}

function mapUser(row: AuthUserRow): AuthUser {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    profileType: row.profile_type,
    status: row.status,
  }
}

function assertUserCanAuthenticate(user: AuthUserRow) {
  if (user.status === "suspended" || user.status === "deleted") {
    throw new ForbiddenException("User account is not active.")
  }
}

function throwInvalidCredentials(): never {
  throw new UnauthorizedException("Invalid email or password.")
}

function parsePasswordHash(passwordHash: string):
  | {
      key: Buffer
      options: typeof scryptOptions
      salt: Buffer
    }
  | undefined {
  const [algorithm, params, salt, key] = passwordHash.split("$")

  if (algorithm !== "scrypt" || !params || !salt || !key) {
    return undefined
  }

  const optionPairs = Object.fromEntries(
    params.split(",").map((pair) => pair.split("="))
  )
  const N = Number(optionPairs.N)
  const r = Number(optionPairs.r)
  const p = Number(optionPairs.p)

  if (!Number.isInteger(N) || !Number.isInteger(r) || !Number.isInteger(p)) {
    return undefined
  }

  return {
    key: Buffer.from(key, "base64url"),
    options: { ...scryptOptions, N, r, p },
    salt: Buffer.from(salt, "base64url"),
  }
}

function deriveScryptKey(
  password: string,
  salt: Buffer,
  keyLength: number,
  options: typeof scryptOptions
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, keyLength, options, (error, derivedKey) => {
      if (error) {
        reject(error)
        return
      }

      resolve(derivedKey)
    })
  })
}

function toIsoString(value: Date | string) {
  return new Date(value).toISOString()
}

function isUniqueViolation(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505"
  )
}
