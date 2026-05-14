import Link from "next/link"
import { ArrowLeftIcon, KeyRoundIcon } from "lucide-react"

import { changePasswordAction } from "@/app/(account)/account/actions"
import { requireAccountSession } from "@/app/(account)/account/_lib/session"
import { routes } from "@/lib/routes"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
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

type SecurityPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function AccountSecurityPage({
  searchParams,
}: SecurityPageProps) {
  const params = await searchParams
  const status = readPasswordStatus(params.settings)
  await requireAccountSession(routes.accountSecurity)

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div className="flex flex-col gap-3">
          <Badge variant="outline" className="w-fit">
            Sicurezza
          </Badge>
          <div className="grid gap-2">
            <h1 className="text-3xl font-semibold tracking-normal">
              Cambia password
            </h1>
            <p className="text-sm leading-6 text-muted-foreground">
              Aggiorna la password e chiudi automaticamente le vecchie sessioni.
            </p>
          </div>
        </div>
        <Button asChild variant="outline">
          <Link href={routes.accountSettings}>
            <ArrowLeftIcon data-icon="inline-start" aria-hidden="true" />
            Profilo
          </Link>
        </Button>
      </div>

      <PasswordFeedback status={status} />

      <Card>
        <CardHeader>
          <CardTitle>Nuova password</CardTitle>
          <CardDescription>
            Usa una password diversa da quella attuale, lunga almeno 10
            caratteri.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={changePasswordAction} className="grid gap-5">
            <input
              type="hidden"
              name="nextPath"
              value={routes.accountSecurity}
            />
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="currentPassword">
                  Password attuale
                </FieldLabel>
                <Input
                  id="currentPassword"
                  name="currentPassword"
                  type="password"
                  autoComplete="current-password"
                  maxLength={128}
                  required
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="newPassword">Nuova password</FieldLabel>
                  <Input
                    id="newPassword"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    minLength={10}
                    maxLength={128}
                    required
                  />
                  <FieldDescription>Almeno 10 caratteri.</FieldDescription>
                </Field>
                <Field>
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
                  />
                </Field>
              </div>
            </FieldGroup>
            <div className="flex justify-end">
              <Button type="submit">
                <KeyRoundIcon data-icon="inline-start" aria-hidden="true" />
                Salva password
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}

function PasswordFeedback({ status }: { status: string | null }) {
  if (!status) {
    return null
  }

  const message = {
    "invalid-password": "Controlla la nuova password prima di salvare.",
    "password-api": "Non e' stato possibile cambiare password.",
    "password-current": "La password attuale non e' corretta.",
    "password-mismatch": "Le nuove password non coincidono.",
    "password-saved": "Password aggiornata e sessione ruotata.",
  }[status]

  return message ? (
    <Card>
      <CardHeader>
        <CardTitle>Stato sicurezza</CardTitle>
        <CardDescription>{message}</CardDescription>
      </CardHeader>
    </Card>
  ) : null
}

function readPasswordStatus(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value

  return typeof raw === "string" ? raw : null
}
