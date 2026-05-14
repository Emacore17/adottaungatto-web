"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { logout } from "@/lib/api/auth"
import { clearSessionCookie } from "@/lib/auth/cookies"
import { getSessionToken } from "@/lib/auth/session"
import { routes } from "@/lib/routes"
import { assertTrustedActionOrigin } from "@/lib/security/server-action-origin"

export async function logoutAction() {
  await assertTrustedActionOrigin()

  const token = await getSessionToken()

  if (token) {
    await logout(token)
  }

  await clearSessionCookie()
  revalidatePath(routes.home)
  revalidatePath(routes.account)
  redirect(routes.home)
}
