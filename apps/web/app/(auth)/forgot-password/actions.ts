"use server"

import { redirect } from "next/navigation"
import { authRequestPasswordResetSchema } from "@workspace/validation/auth"

import { requestPasswordReset } from "@/lib/api/auth"
import { routes } from "@/lib/routes"
import { assertTrustedActionOrigin } from "@/lib/security/server-action-origin"

export async function requestPasswordResetAction(formData: FormData) {
  await assertTrustedActionOrigin()

  const parsed = authRequestPasswordResetSchema.safeParse({
    email: formData.get("email"),
  })

  if (!parsed.success) {
    redirect(`${routes.forgotPassword}?error=invalid`)
  }

  const result = await requestPasswordReset(parsed.data)

  if (!result.ok) {
    redirect(`${routes.forgotPassword}?error=api`)
  }

  redirect(`${routes.forgotPassword}?sent=1`)
}
