import { cookies } from "next/headers"

import type { AuthSessionResponse } from "@/lib/api/auth"
import { isProduction } from "@/lib/config/env"
import { sessionCookieName } from "@/lib/auth/constants"

export async function setSessionCookie(session: AuthSessionResponse["session"]) {
  const cookieStore = await cookies()

  cookieStore.set(sessionCookieName, session.token, {
    expires: new Date(session.expiresAt),
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: isProduction,
  })
}
