"use server"

import { redirect } from "next/navigation"
import { authRegisterSchema } from "@workspace/validation/auth"

import { register } from "@/lib/api/auth"
import { setSessionCookie } from "@/lib/auth/cookies"
import { normalizePhoneE164, phoneE164Pattern } from "@/lib/phone"
import { routes } from "@/lib/routes"
import { assertTrustedActionOrigin } from "@/lib/security/server-action-origin"

export async function registerAction(formData: FormData) {
  await assertTrustedActionOrigin()

  const password = readFormString(formData, "password")
  const passwordConfirm = readFormString(formData, "passwordConfirm")
  const phoneE164 = normalizePhoneE164(
    readFormString(formData, "phoneCountryCode"),
    readFormString(formData, "phoneNationalNumber")
  )

  if (password !== passwordConfirm) {
    redirect(`${routes.register}?error=invalid`)
  }

  if (phoneE164 && !phoneE164Pattern.test(phoneE164)) {
    redirect(`${routes.register}?error=invalid`)
  }

  const parsed = authRegisterSchema.safeParse({
    displayName: formData.get("displayName"),
    email: formData.get("email"),
    password,
    phoneE164,
    showPhoneOnListings: readBooleanFormValue(formData, "showPhoneOnListings"),
    profileType: formData.get("profileType") ?? "private",
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

function readFormString(formData: FormData, key: string) {
  const value = formData.get(key)

  return typeof value === "string" ? value : ""
}

function readBooleanFormValue(formData: FormData, key: string) {
  const value = readFormString(formData, key)

  return value === "true" || value === "on"
}
