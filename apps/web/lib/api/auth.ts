import type {
  AuthChangePasswordInput,
  AuthLoginInput,
  AuthRegisterInput,
  AuthRequestPasswordResetInput,
  AuthResetPasswordInput,
} from "@workspace/validation/auth"

import { apiFetch, type ApiResult } from "@/lib/api/client"

export type AuthUser = {
  id: string
  email: string
  displayName: string
  profileType: string
  roles?: string[]
  status: string
}

export type AuthSession = {
  id: string
  expiresAt: string
}

export type AuthSessionResponse = {
  user: AuthUser
  session: AuthSession & {
    token: string
  }
}

export type CurrentAuthSessionResponse = {
  user: AuthUser
  session: AuthSession
}

export type LogoutResponse = {
  revoked: boolean
}

export type PasswordResetRequestResponse = {
  sent: boolean
}

export type PasswordResetResponse = {
  reset: boolean
}

export type PasswordChangeResponse = {
  changed: boolean
  session: AuthSession & {
    token: string
  }
}

export function login(
  input: AuthLoginInput
): Promise<ApiResult<AuthSessionResponse>> {
  return apiFetch<AuthSessionResponse>("/auth/login", {
    body: input,
    cache: "no-store",
    method: "POST",
  })
}

export function register(
  input: AuthRegisterInput
): Promise<ApiResult<AuthSessionResponse>> {
  return apiFetch<AuthSessionResponse>("/auth/register", {
    body: input,
    cache: "no-store",
    method: "POST",
  })
}

export function currentSession(
  token: string
): Promise<ApiResult<CurrentAuthSessionResponse>> {
  return apiFetch<CurrentAuthSessionResponse>("/auth/me", {
    bearerToken: token,
    cache: "no-store",
  })
}

export function logout(token: string): Promise<ApiResult<LogoutResponse>> {
  return apiFetch<LogoutResponse>("/auth/logout", {
    bearerToken: token,
    cache: "no-store",
    method: "POST",
  })
}

export function requestPasswordReset(
  input: AuthRequestPasswordResetInput
): Promise<ApiResult<PasswordResetRequestResponse>> {
  return apiFetch<PasswordResetRequestResponse>(
    "/auth/password-reset/request",
    {
      body: input,
      cache: "no-store",
      method: "POST",
    }
  )
}

export function resetPassword(
  input: AuthResetPasswordInput
): Promise<ApiResult<PasswordResetResponse>> {
  return apiFetch<PasswordResetResponse>("/auth/password-reset/confirm", {
    body: input,
    cache: "no-store",
    method: "POST",
  })
}

export function changePassword(
  bearerToken: string,
  input: AuthChangePasswordInput
): Promise<ApiResult<PasswordChangeResponse>> {
  return apiFetch<PasswordChangeResponse>("/auth/password/change", {
    bearerToken,
    body: input,
    cache: "no-store",
    method: "POST",
  })
}
