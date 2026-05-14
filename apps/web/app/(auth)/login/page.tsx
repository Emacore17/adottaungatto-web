import Link from "next/link"
import { KeyRoundIcon, LogInIcon, UserPlusIcon } from "lucide-react"

import { AuthShell } from "@/app/(auth)/_components/auth-shell"
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
  const hasError = typeof params.error === "string"
  const resetDone = params.reset === "success"
  const accountStatus =
    params.account === "deleted" || params.account === "deactivated"
      ? params.account
      : null

  return (
    <AuthShell
      actionHref={routes.register}
      actionLabel="Registrati"
      description="Entra, riprendi preferiti e annunci, continua da dove eri."
      eyebrow="Accesso"
      title="Bentornato"
    >
      <Card className="w-full max-w-md border-brand-teal/18 bg-card/92 shadow-[0_28px_84px_-60px_color-mix(in_oklab,var(--color-brand-teal-ink)_70%,transparent)] ring-brand-teal/18 supports-backdrop-filter:bg-card/88 supports-backdrop-filter:backdrop-blur-xl">
        <CardHeader className="gap-2 px-5 pt-6 pb-2 sm:px-6 sm:pt-7">
          <CardTitle className="text-2xl">Accedi</CardTitle>
          <CardDescription>Inserisci le credenziali.</CardDescription>
        </CardHeader>
        <form action={loginAction}>
          <input type="hidden" name="next" value={next} />
          <CardContent className="px-5 py-5 sm:px-6">
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
                  Credenziali non valide.
                </p>
              ) : null}
              {resetDone ? (
                <p className="text-sm text-brand-teal-ink">
                  Password aggiornata. Accedi con le nuove credenziali.
                </p>
              ) : null}
              {accountStatus ? (
                <p className="text-sm text-brand-teal-ink">
                  {accountStatus === "deleted"
                    ? "Account eliminato."
                    : "Account disattivato."}
                </p>
              ) : null}
            </FieldGroup>
          </CardContent>
          <CardFooter className="flex-col items-stretch gap-3 px-5 pb-6 sm:px-6 sm:pb-7">
            <Button type="submit" size="lg" className="w-full">
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
          </CardFooter>
        </form>
      </Card>
    </AuthShell>
  )
}
