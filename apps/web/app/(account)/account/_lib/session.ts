import { redirect } from "next/navigation"

import { currentSession } from "@/lib/api/auth"
import { getSessionToken } from "@/lib/auth/session"
import { routes } from "@/lib/routes"

export async function requireAccountSession(next = routes.account) {
  const token = await getSessionToken()

  if (!token) {
    redirect(routes.login(next))
  }

  const session = await currentSession(token)

  if (!session.ok) {
    redirect(routes.login(next))
  }

  return {
    session: session.data,
    token,
  }
}
