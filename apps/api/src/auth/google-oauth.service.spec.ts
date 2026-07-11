import { ServiceUnavailableException, UnauthorizedException } from "@nestjs/common"
import { describe, expect, it, vi } from "vitest"

import type { ApiEnv } from "../config/env.js"
import type { RedisService } from "../redis/redis.service.js"
import type { AuthService } from "./auth.service.js"
import type { GoogleOAuthClient } from "./google-oauth.client.js"
import { GoogleOAuthService } from "./google-oauth.service.js"

const enabledEnv = {
  APP_URL: "https://www.adottaungatto.it",
  GOOGLE_CLIENT_ID: "client-id.apps.googleusercontent.com",
  GOOGLE_CLIENT_SECRET: "client-secret",
  GOOGLE_OAUTH_ENABLED: true,
  GOOGLE_OAUTH_REDIRECT_URI:
    "https://api.adottaungatto.it/auth/oauth/google/callback",
} as unknown as ApiEnv

const disabledEnv = {
  ...enabledEnv,
  GOOGLE_OAUTH_ENABLED: false,
} as unknown as ApiEnv

describe("GoogleOAuthService", () => {
  it("refuses to build an authorization url when disabled", async () => {
    const { service } = createService(disabledEnv)

    await expect(service.createAuthorizationUrl()).rejects.toBeInstanceOf(
      ServiceUnavailableException
    )
  })

  it("builds an authorization url and stores the PKCE state", async () => {
    const { service, redis } = createService(enabledEnv)

    const url = new URL(await service.createAuthorizationUrl())

    expect(url.origin + url.pathname).toBe(
      "https://accounts.google.com/o/oauth2/v2/auth"
    )
    expect(url.searchParams.get("client_id")).toBe(
      "client-id.apps.googleusercontent.com"
    )
    expect(url.searchParams.get("redirect_uri")).toBe(
      "https://api.adottaungatto.it/auth/oauth/google/callback"
    )
    expect(url.searchParams.get("response_type")).toBe("code")
    expect(url.searchParams.get("scope")).toBe("openid email profile")
    expect(url.searchParams.get("code_challenge_method")).toBe("S256")
    expect(url.searchParams.get("code_challenge")).toBeTruthy()
    expect(url.searchParams.get("state")).toBeTruthy()
    expect(url.searchParams.get("nonce")).toBeTruthy()
    expect(redis.setWithExpiry).toHaveBeenCalledTimes(1)
    const [stateKey] = vi.mocked(redis.setWithExpiry).mock.calls[0]!
    expect(stateKey).toBe(`oauth:google:state:${url.searchParams.get("state")}`)
  })

  it("exchanges the callback code and stores a single-use handoff", async () => {
    const { service, redis, authService, client } = createService(enabledEnv)
    vi.mocked(redis.takeValue).mockResolvedValue(
      JSON.stringify({ codeVerifier: "verifier", nonce: "nonce" })
    )
    vi.mocked(client.exchangeCodeForProfile).mockResolvedValue({
      provider: "google",
      providerAccountId: "google-sub-123",
      email: "user@example.com",
      emailVerified: true,
      displayName: "Google User",
    })
    vi.mocked(authService.loginWithOAuth).mockResolvedValue({
      user: {
        id: "user-id",
        email: "user@example.com",
        displayName: "Google User",
        profileType: "private",
        status: "active",
      },
      session: {
        id: "session-id",
        token: "session-token",
        expiresAt: "2026-07-01T10:00:00.000Z",
      },
    })

    const handoffCode = await service.handleCallback({
      code: "auth-code",
      state: "state-value",
    })

    expect(redis.takeValue).toHaveBeenCalledWith("oauth:google:state:state-value")
    expect(client.exchangeCodeForProfile).toHaveBeenCalledWith({
      code: "auth-code",
      codeVerifier: "verifier",
      redirectUri:
        "https://api.adottaungatto.it/auth/oauth/google/callback",
    })
    expect(redis.setWithExpiry).toHaveBeenCalledWith(
      `oauth:google:handoff:${handoffCode}`,
      "session-token",
      120
    )
  })

  it("rejects a callback with an unknown state", async () => {
    const { service, redis, authService } = createService(enabledEnv)
    vi.mocked(redis.takeValue).mockResolvedValue(null)

    await expect(
      service.handleCallback({ code: "auth-code", state: "missing" })
    ).rejects.toBeInstanceOf(UnauthorizedException)
    expect(authService.loginWithOAuth).not.toHaveBeenCalled()
  })

  it("finishes login by exchanging the handoff for a session", async () => {
    const { service, redis, authService } = createService(enabledEnv)
    vi.mocked(redis.takeValue).mockResolvedValue("session-token")
    vi.mocked(authService.currentSession).mockResolvedValue({
      user: {
        id: "user-id",
        email: "user@example.com",
        displayName: "Google User",
        profileType: "private",
        status: "active",
      },
      session: {
        id: "session-id",
        expiresAt: "2026-07-01T10:00:00.000Z",
      },
    })

    await expect(service.finishLogin("handoff-code")).resolves.toEqual({
      user: {
        id: "user-id",
        email: "user@example.com",
        displayName: "Google User",
        profileType: "private",
        status: "active",
      },
      session: {
        id: "session-id",
        token: "session-token",
        expiresAt: "2026-07-01T10:00:00.000Z",
      },
    })
    expect(redis.takeValue).toHaveBeenCalledWith(
      "oauth:google:handoff:handoff-code"
    )
  })

  it("rejects finishing login with an expired handoff", async () => {
    const { service, redis } = createService(enabledEnv)
    vi.mocked(redis.takeValue).mockResolvedValue(null)

    await expect(service.finishLogin("missing")).rejects.toBeInstanceOf(
      UnauthorizedException
    )
  })
})

function createService(env: ApiEnv) {
  const redis = {
    setWithExpiry: vi.fn().mockResolvedValue(undefined),
    takeValue: vi.fn().mockResolvedValue(null),
  } as unknown as RedisService
  const authService = {
    currentSession: vi.fn(),
    loginWithOAuth: vi.fn(),
  } as unknown as AuthService
  const client = {
    exchangeCodeForProfile: vi.fn(),
  } as unknown as GoogleOAuthClient
  const service = new GoogleOAuthService(env, redis, authService, client)

  return { authService, client, redis, service }
}
