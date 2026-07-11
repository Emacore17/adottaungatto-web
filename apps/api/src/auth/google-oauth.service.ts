import { createHash, randomBytes } from "node:crypto"

import {
  Inject,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common"

import { API_ENV } from "../config/config.module.js"
import type { ApiEnv } from "../config/env.js"
import { RedisService } from "../redis/redis.service.js"
import { AuthService } from "./auth.service.js"
import type { AuthSessionResponse } from "./auth.types.js"
import {
  GOOGLE_OAUTH_CLIENT,
  type GoogleOAuthClient,
} from "./google-oauth.client.js"

const authorizationEndpoint = "https://accounts.google.com/o/oauth2/v2/auth"
const stateTtlSeconds = 600
const handoffTtlSeconds = 120

type StoredState = {
  codeVerifier: string
  nonce: string
}

@Injectable()
export class GoogleOAuthService {
  constructor(
    @Inject(API_ENV)
    private readonly env: ApiEnv,
    @Inject(RedisService)
    private readonly redis: RedisService,
    @Inject(AuthService)
    private readonly authService: AuthService,
    @Inject(GOOGLE_OAUTH_CLIENT)
    private readonly client: GoogleOAuthClient
  ) {}

  isEnabled() {
    return this.env.GOOGLE_OAUTH_ENABLED
  }

  async createAuthorizationUrl(): Promise<string> {
    this.assertEnabled()

    const state = randomToken()
    const codeVerifier = randomToken(64)
    const nonce = randomToken()
    const codeChallenge = createHash("sha256")
      .update(codeVerifier)
      .digest("base64url")

    await this.redis.setWithExpiry(
      stateKey(state),
      JSON.stringify({ codeVerifier, nonce } satisfies StoredState),
      stateTtlSeconds
    )

    const url = new URL(authorizationEndpoint)
    url.searchParams.set("client_id", this.env.GOOGLE_CLIENT_ID)
    url.searchParams.set("redirect_uri", this.env.GOOGLE_OAUTH_REDIRECT_URI)
    url.searchParams.set("response_type", "code")
    url.searchParams.set("scope", "openid email profile")
    url.searchParams.set("state", state)
    url.searchParams.set("nonce", nonce)
    url.searchParams.set("code_challenge", codeChallenge)
    url.searchParams.set("code_challenge_method", "S256")
    url.searchParams.set("access_type", "online")
    url.searchParams.set("prompt", "select_account")

    return url.toString()
  }

  async handleCallback(input: {
    code: string
    state: string
  }): Promise<string> {
    this.assertEnabled()

    const stored = await this.redis.takeValue(stateKey(input.state))

    if (!stored) {
      throw new UnauthorizedException("Invalid or expired Google login state.")
    }

    const { codeVerifier } = JSON.parse(stored) as StoredState
    const profile = await this.client.exchangeCodeForProfile({
      code: input.code,
      codeVerifier,
      redirectUri: this.env.GOOGLE_OAUTH_REDIRECT_URI,
    })
    const session = await this.authService.loginWithOAuth(profile)
    const handoffCode = randomToken()

    await this.redis.setWithExpiry(
      handoffKey(handoffCode),
      session.session.token,
      handoffTtlSeconds
    )

    return handoffCode
  }

  async finishLogin(handoffCode: string): Promise<AuthSessionResponse> {
    this.assertEnabled()

    const token = await this.redis.takeValue(handoffKey(handoffCode))

    if (!token) {
      throw new UnauthorizedException("Invalid or expired Google login code.")
    }

    const current = await this.authService.currentSession(token)

    return {
      user: current.user,
      session: {
        id: current.session.id,
        token,
        expiresAt: current.session.expiresAt,
      },
    }
  }

  webRedirectUrl(handoffCode: string): string {
    const url = new URL("/auth/google/finish", this.env.APP_URL)
    url.searchParams.set("code", handoffCode)

    return url.toString()
  }

  webErrorUrl(): string {
    const url = new URL("/login", this.env.APP_URL)
    url.searchParams.set("error", "google")

    return url.toString()
  }

  private assertEnabled() {
    if (!this.isEnabled()) {
      throw new ServiceUnavailableException("Google login is not enabled.")
    }
  }
}

function stateKey(state: string) {
  return `oauth:google:state:${state}`
}

function handoffKey(code: string) {
  return `oauth:google:handoff:${code}`
}

function randomToken(bytes = 32) {
  return randomBytes(bytes).toString("base64url")
}
