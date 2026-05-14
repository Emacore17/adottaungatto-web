"use server"

import { redirect } from "next/navigation"
import { authResetPasswordSchema } from "@workspace/validation/auth"

import { resetPassword } from "@/lib/api/auth"
import { routes } from "@/lib/routes"
import { assertTrustedActionOrigin } from "@/lib/security/server-action-origin"

export async function resetPasswordAction(formData: FormData) {
  await assertTrustedActionOrigin()

  const token = readFormString(formData, "token")
  const password = readFormString(formData, "password")
  const passwordConfirm = readFormString(formData, "passwordConfirm")
  const targetPath = routes.resetPassword(token)

  if (password !== passwordConfirm) {
    redirectWithError(targetPath, "mismatch")
  }

  const parsed = authResetPasswordSchema.safeParse({
    token,
    password,
  })

  if (!parsed.success) {
    redirectWithError(targetPath, "invalid")
  }

  const result = await resetPassword(parsed.data)

  if (!result.ok) {
    redirectWithError(targetPath, "api")
  }

  redirect(`${routes.login()}?reset=success`)
}

function redirectWithError(path: string, error: string): never {
  const separator = path.includes("?") ? "&" : "?"

  redirect(`${path}${separator}error=${encodeURIComponent(error)}`)
}

function readFormString(formData: FormData, key: string) {
  const value = formData.get(key)

  return typeof value === "string" ? value : ""
}
