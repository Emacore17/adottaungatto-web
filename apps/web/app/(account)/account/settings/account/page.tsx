import Link from "next/link"
import { ArrowLeftIcon, PauseCircleIcon, Trash2Icon } from "lucide-react"

import {
  deactivateAccountAction,
  deleteAccountAction,
} from "@/app/(account)/account/actions"
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

type AccountDangerPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function AccountDangerPage({
  searchParams,
}: AccountDangerPageProps) {
  const params = await searchParams
  const status = readAccountStatus(params.settings)
  await requireAccountSession(routes.accountDanger)

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div className="flex flex-col gap-3">
          <Badge variant="outline" className="w-fit">
            Account
          </Badge>
          <div className="grid gap-2">
            <h1 className="text-3xl font-semibold tracking-normal">
              Sospensione ed eliminazione
            </h1>
            <p className="text-sm leading-6 text-muted-foreground">
              Queste operazioni chiudono la sessione corrente e richiedono la
              password.
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

      <AccountFeedback status={status} />

      <div className="grid gap-5">
        <Card>
          <CardHeader>
            <CardTitle>Disattiva account</CardTitle>
            <CardDescription>
              Blocca l&apos;accesso finche un amministratore non lo riattiva.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={deactivateAccountAction} className="grid gap-4">
              <input
                type="hidden"
                name="nextPath"
                value={routes.accountDanger}
              />
              <Field>
                <FieldLabel htmlFor="deactivatePassword">
                  Password attuale
                </FieldLabel>
                <Input
                  id="deactivatePassword"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                />
              </Field>
              <div className="flex justify-end">
                <Button type="submit" variant="outline">
                  <PauseCircleIcon
                    data-icon="inline-start"
                    aria-hidden="true"
                  />
                  Sospendi accesso
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Elimina account</CardTitle>
            <CardDescription>
              Rimuove i dati personali principali e revoca ogni sessione.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={deleteAccountAction} className="grid gap-4">
              <input
                type="hidden"
                name="nextPath"
                value={routes.accountDanger}
              />
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="deletePassword">
                    Password attuale
                  </FieldLabel>
                  <Input
                    id="deletePassword"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="deleteConfirmation">
                    Scrivi ELIMINA
                  </FieldLabel>
                  <Input
                    id="deleteConfirmation"
                    name="confirmation"
                    placeholder="ELIMINA"
                    required
                  />
                  <FieldDescription>
                    L&apos;operazione non riapre l&apos;account.
                  </FieldDescription>
                </Field>
              </FieldGroup>
              <div className="flex justify-end">
                <Button type="submit" variant="destructive">
                  <Trash2Icon data-icon="inline-start" aria-hidden="true" />
                  Elimina account
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}

function AccountFeedback({ status }: { status: string | null }) {
  if (!status) {
    return null
  }

  const message = {
    "account-api": "Non e' stato possibile aggiornare lo stato account.",
    "account-confirm-invalid": "Scrivi ELIMINA per confermare.",
    "account-password-invalid": "Password non valida per questa operazione.",
  }[status]

  return message ? (
    <Card>
      <CardHeader>
        <CardTitle>Stato account</CardTitle>
        <CardDescription>{message}</CardDescription>
      </CardHeader>
    </Card>
  ) : null
}

function readAccountStatus(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value

  return typeof raw === "string" ? raw : null
}
