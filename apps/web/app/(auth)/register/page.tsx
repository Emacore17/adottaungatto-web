import { AuthShell } from "@/app/(auth)/_components/auth-shell"
import { RegisterOnboarding } from "@/app/(auth)/register/_components/register-onboarding"
import { registerAction } from "@/app/(auth)/register/actions"
import { routes } from "@/lib/routes"

type RegisterPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function RegisterPage({
  searchParams,
}: RegisterPageProps) {
  const params = await searchParams
  const hasError = typeof params.error === "string"

  return (
    <AuthShell
      actionHref={routes.login()}
      actionLabel="Accedi"
      description="Scegli il profilo e crea lo spazio da cui gestire annunci, preferiti e contatti."
      eyebrow="Prima volta"
      title="Crea il tuo spazio"
    >
      <RegisterOnboarding action={registerAction} hasError={hasError} />
    </AuthShell>
  )
}
