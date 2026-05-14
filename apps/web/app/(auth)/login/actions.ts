"use server"

import { redirect } from "next/navigation"
import { authLoginSchema } from "@workspace/validation/auth"

import { login } from "@/lib/api/auth"
import { setSessionCookie } from "@/lib/auth/cookies"
import { getSafeNextPath } from "@/lib/auth/redirects"
import { routes } from "@/lib/routes"
import { assertTrustedActionOrigin } from "@/lib/security/server-action-origin"

export async function loginAction(formData: FormData) {
  await assertTrustedActionOrigin()

  const next = getSafeNextPath(formData.get("next") ?? undefined)
  const parsed = authLoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  })

  if (!parsed.success) {
    redirect(`${routes.login(next)}&error=invalid`)
  }

  const response = await login(parsed.data)

  if (!response.ok) {
    redirect(`${routes.login(next)}&error=credentials`)
  }

  await setSessionCookie(response.data.session)
  redirect(next)
}
