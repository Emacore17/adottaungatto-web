import type {
  AuthLoginInput,
  AuthRegisterInput,
} from "@workspace/validation/auth"

import { apiFetch, type ApiResult } from "@/lib/api/client"

export type AuthUser = {
  id: string
  email: string
  displayName: string
  profileType: string
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
