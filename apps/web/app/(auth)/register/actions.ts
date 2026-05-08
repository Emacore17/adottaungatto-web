"use server"

import { redirect } from "next/navigation"
import { authRegisterSchema } from "@workspace/validation/auth"

import { register } from "@/lib/api/auth"
import { setSessionCookie } from "@/lib/auth/cookies"
import { routes } from "@/lib/routes"

export async function registerAction(formData: FormData) {
  const parsed = authRegisterSchema.safeParse({
    displayName: formData.get("displayName"),
    email: formData.get("email"),
    password: formData.get("password"),
    profileType: "private",
  })

  if (!parsed.success) {
    redirect(`${routes.register}?error=invalid`)
  }

  const response = await register(parsed.data)

  if (!response.ok) {
    redirect(`${routes.register}?error=account`)
  }

  await setSessionCookie(response.data.session)
  redirect(routes.account)
}
