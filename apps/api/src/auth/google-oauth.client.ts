import { Inject, Injectable } from "@nestjs/common"

import { API_ENV } from "../config/config.module.js"
import type { ApiEnv } from "../config/env.js"
import type { OAuthProfileInput } from "./auth.types.js"

export type GoogleCodeExchange = {
  code: string
  codeVerifier: string
  redirectUri: string
}

export interface GoogleOAuthClient {
  exchangeCodeForProfile(input: GoogleCodeExchange): Promise<OAuthProfileInput>
}

export const GOOGLE_OAUTH_CLIENT = Symbol("GOOGLE_OAUTH_CLIENT")

const tokenEndpoint = "https://oauth2.googleapis.com/token"
const userInfoEndpoint = "https://openidconnect.googleapis.com/v1/userinfo"

// Scambia il code per un access token via chiamata server-to-server a Google
// (TLS + client secret), poi legge il profilo dall'endpoint userinfo. Non
// verifichiamo la firma dell'id_token perche' l'access token arriva
// direttamente da Google sul canale autenticato, non dal browser.
@Injectable()
export class HttpGoogleOAuthClient implements GoogleOAuthClient {
  constructor(@Inject(API_ENV) private readonly env: ApiEnv) {}

  async exchangeCodeForProfile(
    input: GoogleCodeExchange
  ): Promise<OAuthProfileInput> {
    const tokenResponse = await fetch(tokenEndpoint, {
      body: new URLSearchParams({
        client_id: this.env.GOOGLE_CLIENT_ID,
        client_secret: this.env.GOOGLE_CLIENT_SECRET,
        code: input.code,
        code_verifier: input.codeVerifier,
        grant_type: "authorization_code",
        redirect_uri: input.redirectUri,
      }),
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      method: "POST",
    })

    if (!tokenResponse.ok) {
      throw new Error(
        `Google token exchange failed with status ${tokenResponse.status}.`
      )
    }

    const tokenJson = (await tokenResponse.json()) as { access_token?: unknown }
    const accessToken =
      typeof tokenJson.access_token === "string" ? tokenJson.access_token : null

    if (!accessToken) {
      throw new Error("Google token exchange did not return an access token.")
    }

    const userResponse = await fetch(userInfoEndpoint, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!userResponse.ok) {
      throw new Error(
        `Google userinfo request failed with status ${userResponse.status}.`
      )
    }

    const profile = (await userResponse.json()) as {
      email?: unknown
      email_verified?: unknown
      name?: unknown
      sub?: unknown
    }
    const providerAccountId = typeof profile.sub === "string" ? profile.sub : ""
    const email = typeof profile.email === "string" ? profile.email : ""

    if (!providerAccountId || !email) {
      throw new Error("Google userinfo response is missing required fields.")
    }

    const name =
      typeof profile.name === "string" && profile.name.trim()
        ? profile.name.trim()
        : (email.split("@")[0] ?? email)

    return {
      displayName: name,
      email,
      emailVerified: profile.email_verified === true,
      provider: "google",
      providerAccountId,
    }
  }
}
