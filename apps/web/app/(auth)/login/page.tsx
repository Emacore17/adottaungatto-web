import Link from "next/link"
import { KeyRoundIcon, LogInIcon, UserPlusIcon } from "lucide-react"

import { AuthShell } from "@/app/(auth)/_components/auth-shell"
import { GoogleLoginButton } from "@/app/(auth)/_components/google-login-button"
import { loginAction } from "@/app/(auth)/login/actions"
import { routes } from "@/lib/routes"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { Field, FieldGroup, FieldLabel } from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"

type LoginPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams
  const next = typeof params.next === "string" ? params.next : routes.account
  const googleError = params.error === "google"
  const hasError = typeof params.error === "string"
  const resetDone = params.reset === "success"
  const accountStatus =
    params.account === "deleted" || params.account === "deactivated"
      ? params.account
      : null

  return (
    <AuthShell>
      <Card className="w-full max-w-xl lg:border-transparent lg:bg-transparent lg:shadow-none">
        <CardHeader className="gap-2 px-6 pt-8 pb-2">
          <CardTitle className="text-2xl font-semibold tracking-tight">
            Bentornato
          </CardTitle>
          <CardDescription>Inserisci le credenziali per accedere.</CardDescription>
        </CardHeader>
        <form action={loginAction}>
          <input type="hidden" name="next" value={next} />
          <CardContent className="px-6 py-6">
            <FieldGroup className="gap-5">
              <Field data-invalid={hasError || undefined}>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  aria-invalid={hasError || undefined}
                  placeholder="nome@email.it"
                />
              </Field>
              <Field data-invalid={hasError || undefined}>
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  aria-invalid={hasError || undefined}
                  placeholder="La tua password"
                />
              </Field>
              {hasError ? (
                <p className="text-sm text-destructive">
                  {googleError
                    ? "Accesso con Google non riuscito. Riprova."
                    : "Credenziali non valide."}
                </p>
              ) : null}
              {resetDone ? (
                <p className="text-sm text-foreground">
                  Password aggiornata. Accedi con le nuove credenziali.
                </p>
              ) : null}
              {accountStatus ? (
                <p className="text-sm text-foreground">
                  {accountStatus === "deleted"
                    ? "Account eliminato."
                    : "Account disattivato."}
                </p>
              ) : null}
            </FieldGroup>
          </CardContent>
          <CardFooter className="flex-col items-stretch gap-3 px-6 pb-8">
            <Button type="submit" variant="accent" size="lg" className="w-full">
              <LogInIcon aria-hidden="true" data-icon="inline-start" />
              Accedi
            </Button>
            <Button asChild variant="ghost" className="w-full">
              <Link href={routes.forgotPassword}>
                <KeyRoundIcon aria-hidden="true" data-icon="inline-start" />
                Hai dimenticato la password?
              </Link>
            </Button>
            <Button asChild variant="link" className="w-full">
              <Link href={routes.register}>
                <UserPlusIcon aria-hidden="true" data-icon="inline-start" />
                Crea account
              </Link>
            </Button>
            <GoogleLoginButton label="Continua con Google" />
          </CardFooter>
        </form>
      </Card>
    </AuthShell>
  )
}
