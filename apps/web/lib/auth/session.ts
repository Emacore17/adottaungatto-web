import { cookies } from "next/headers"

import { sessionCookieName } from "@/lib/auth/constants"

export async function getSessionToken() {
  const cookieStore = await cookies()

  return cookieStore.get(sessionCookieName)?.value ?? null
}

export { sessionCookieName }
