import type { Metadata } from "next"

import { AuthShell } from "@/app/(auth)/_components/auth-shell"
import { GoogleLoginButton } from "@/app/(auth)/_components/google-login-button"
import { RegisterOnboarding } from "@/app/(auth)/register/_components/register-onboarding"
import { registerAction } from "@/app/(auth)/register/actions"
import { routes } from "@/lib/routes"
import { createPageMetadata } from "@/lib/seo/metadata"

export const metadata: Metadata = createPageMetadata({
  title: "Registrazione",
  path: routes.register,
})

type RegisterPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function RegisterPage({
  searchParams,
}: RegisterPageProps) {
  const params = await searchParams
  const errorCode = typeof params.error === "string" ? params.error : null

  return (
    <AuthShell
      actionHref={routes.login()}
      actionLabel="Accedi"
      description="Scegli il profilo e crea lo spazio da cui gestire annunci, preferiti e contatti."
      eyebrow="Prima volta"
      title="Crea il tuo spazio"
    >
      <RegisterOnboarding action={registerAction} errorCode={errorCode} />
      <div className="mx-auto w-full max-w-xl px-6">
        <GoogleLoginButton label="Registrati con Google" />
      </div>
    </AuthShell>
  )
}
