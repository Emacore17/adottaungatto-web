import Link from "next/link"
import { KeyRoundIcon, LogInIcon } from "lucide-react"

import { AuthShell } from "@/app/(auth)/_components/auth-shell"
import { resetPasswordAction } from "@/app/(auth)/reset-password/actions"
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

type ResetPasswordPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function ResetPasswordPage({
  searchParams,
}: ResetPasswordPageProps) {
  const params = await searchParams
  const token = typeof params.token === "string" ? params.token : ""
  const error = typeof params.error === "string" ? params.error : null
  const canReset = token.length >= 32

  return (
    <AuthShell
      actionHref={routes.login()}
      actionLabel="Accedi"
      description="Scegli una password nuova e diversa dalla precedente."
      eyebrow="Sicurezza"
      title="Reimposta password"
    >
      <Card className="w-full max-w-md border-brand-teal/18 bg-card/92 shadow-[0_28px_84px_-60px_color-mix(in_oklab,var(--color-brand-teal-ink)_70%,transparent)] ring-brand-teal/18 supports-backdrop-filter:bg-card/88 supports-backdrop-filter:backdrop-blur-xl">
        <CardHeader className="gap-2 px-5 pt-6 pb-2 sm:px-6 sm:pt-7">
          <CardTitle className="text-2xl">Nuova password</CardTitle>
          <CardDescription>
            Usa almeno 10 caratteri. I vecchi accessi verranno chiusi.
          </CardDescription>
        </CardHeader>
        {canReset ? (
          <form action={resetPasswordAction}>
            <input type="hidden" name="token" value={token} />
            <CardContent className="px-5 py-5 sm:px-6">
              <FieldGroup className="gap-5">
                <Field data-invalid={Boolean(error) || undefined}>
                  <FieldLabel htmlFor="password">Password</FieldLabel>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    minLength={10}
                    maxLength={128}
                    required
                    aria-invalid={Boolean(error) || undefined}
                  />
                  <FieldDescription>
                    Evita password riutilizzate su altri servizi.
                  </FieldDescription>
                </Field>
                <Field data-invalid={Boolean(error) || undefined}>
                  <FieldLabel htmlFor="passwordConfirm">
                    Conferma password
                  </FieldLabel>
                  <Input
                    id="passwordConfirm"
                    name="passwordConfirm"
                    type="password"
                    autoComplete="new-password"
                    minLength={10}
                    maxLength={128}
                    required
                    aria-invalid={Boolean(error) || undefined}
                  />
                </Field>
                {error ? (
                  <p className="text-sm text-destructive">
                    Il link non risulta valido o le password non coincidono.
                  </p>
                ) : null}
              </FieldGroup>
            </CardContent>
            <CardFooter className="flex-col items-stretch gap-3 px-5 pb-6 sm:px-6 sm:pb-7">
              <Button type="submit" size="lg" className="w-full">
                <KeyRoundIcon aria-hidden="true" data-icon="inline-start" />
                Salva password
              </Button>
            </CardFooter>
          </form>
        ) : (
          <CardContent className="grid gap-4 px-5 py-5 sm:px-6">
            <p className="text-sm text-muted-foreground">
              Il link non contiene un token valido. Richiedi un nuovo recupero.
            </p>
            <Button asChild>
              <Link href={routes.forgotPassword}>
                <LogInIcon aria-hidden="true" data-icon="inline-start" />
                Richiedi link
              </Link>
            </Button>
          </CardContent>
        )}
      </Card>
    </AuthShell>
  )
}
