import Link from "next/link"
import { ArrowLeftIcon, MailCheckIcon, MailIcon } from "lucide-react"

import { AuthShell } from "@/app/(auth)/_components/auth-shell"
import { requestPasswordResetAction } from "@/app/(auth)/forgot-password/actions"
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
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"

type ForgotPasswordPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function ForgotPasswordPage({
  searchParams,
}: ForgotPasswordPageProps) {
  const params = await searchParams
  const hasError = typeof params.error === "string"
  const sent = params.sent === "1"

  return (
    <AuthShell
      actionHref={routes.login()}
      actionLabel="Accedi"
      description="Ricevi un link temporaneo e scegli una nuova password."
      eyebrow="Recupero"
      title="Password dimenticata"
    >
      <Card className="w-full max-w-md border-brand-teal/18 bg-card/92 shadow-[0_28px_84px_-60px_color-mix(in_oklab,var(--color-brand-teal-ink)_70%,transparent)] ring-brand-teal/18 supports-backdrop-filter:bg-card/88 supports-backdrop-filter:backdrop-blur-xl">
        {sent ? (
          <PasswordResetSent />
        ) : (
          <>
            <CardHeader className="gap-2 px-5 pt-6 pb-2 sm:px-6 sm:pt-7">
              <CardTitle className="text-2xl">Recupera accesso</CardTitle>
              <CardDescription>
                Ti inviamo un link se questo indirizzo appartiene a un account.
              </CardDescription>
            </CardHeader>
            <form action={requestPasswordResetAction}>
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
                    <FieldDescription>
                      Il link scade dopo poco tempo e disattiva i vecchi
                      accessi.
                    </FieldDescription>
                  </Field>
                  {hasError ? (
                    <p className="text-sm text-destructive">
                      Non riesco a preparare il recupero password.
                    </p>
                  ) : null}
                </FieldGroup>
              </CardContent>
              <CardFooter className="flex-col items-stretch gap-3 px-5 pb-6 sm:px-6 sm:pb-7">
                <Button type="submit" size="lg" className="w-full">
                  <MailIcon aria-hidden="true" data-icon="inline-start" />
                  Invia link
                </Button>
                <Button asChild variant="link" className="w-full">
                  <Link href={routes.login()}>
                    <ArrowLeftIcon
                      aria-hidden="true"
                      data-icon="inline-start"
                    />
                    Torna al login
                  </Link>
                </Button>
              </CardFooter>
            </form>
          </>
        )}
      </Card>
    </AuthShell>
  )
}

function PasswordResetSent() {
  return (
    <>
      <CardHeader className="items-center gap-3 px-5 pt-8 pb-2 text-center sm:px-6">
        <span className="flex size-16 items-center justify-center rounded-full bg-brand-teal-soft text-brand-teal-ink motion-safe:animate-[auth-mail-pop_520ms_ease-out]">
          <MailCheckIcon aria-hidden="true" className="size-8" />
        </span>
        <CardTitle className="text-2xl">Controlla la mail</CardTitle>
        <CardDescription>
          Se l&apos;indirizzo appartiene a un account, abbiamo inviato un link
          per reimpostare la password.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-5 py-4 text-center text-sm leading-6 text-muted-foreground sm:px-6">
        Il link ha una scadenza breve. Dopo il cambio password chiudiamo le
        sessioni precedenti.
      </CardContent>
      <CardFooter className="flex-col items-stretch gap-3 px-5 pb-6 sm:px-6 sm:pb-7">
        <Button asChild size="lg" className="w-full">
          <Link href={routes.login()}>
            <ArrowLeftIcon aria-hidden="true" data-icon="inline-start" />
            Torna al login
          </Link>
        </Button>
      </CardFooter>
    </>
  )
}
