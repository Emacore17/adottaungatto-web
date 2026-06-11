import { cache } from "react"

import { currentSession, type AuthUser } from "@/lib/api/auth"
import { getSessionToken } from "@/lib/auth/session"

export const resolveAuthenticatedUser = cache(
  async (): Promise<AuthUser | null> => {
    const token = await getSessionToken()

    if (!token) {
      return null
    }

    const session = await currentSession(token)

    return session.ok ? session.data.user : null
  }
)
