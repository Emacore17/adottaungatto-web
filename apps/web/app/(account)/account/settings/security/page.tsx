import Link from "next/link"
import {
  ArrowLeftIcon,
  KeyRoundIcon,
  LogOutIcon,
  MonitorSmartphoneIcon,
} from "lucide-react"

import {
  changePasswordAction,
  revokeSessionAction,
} from "@/app/(account)/account/actions"
import { requireAccountSession } from "@/app/(account)/account/_lib/session"
import { listSessions, type AuthSessionSummary } from "@/lib/api/auth"
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
  const { token } = await requireAccountSession(routes.accountSecurity)
  const sessionsResult = await listSessions(token)
  const sessions = sessionsResult.ok ? sessionsResult.data.sessions : []

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div className="flex flex-col gap-3">
          <Badge variant="outline" className="w-fit">
            Sicurezza
          </Badge>
          <div className="grid gap-2">
            <h1 className="text-3xl font-normal tracking-[-0.015em] text-foreground sm:text-4xl">
              Password e sessioni
            </h1>
            <p className="text-sm leading-6 text-muted-foreground">
              Aggiorna la password e gestisci i dispositivi con cui hai
              effettuato l&apos;accesso.
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

      <Card>
        <CardHeader>
          <CardTitle>Sessioni attive</CardTitle>
          <CardDescription>
            Questi sono i dispositivi con una sessione valida. Revoca quelli che
            non riconosci.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sessionsResult.ok ? (
            <ul className="grid gap-3">
              {sessions.map((session) => (
                <SessionRow key={session.id} session={session} />
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              Non e&apos; stato possibile caricare le sessioni. Riprova tra
              poco.
            </p>
          )}
        </CardContent>
      </Card>
    </main>
  )
}

function SessionRow({ session }: { session: AuthSessionSummary }) {
  return (
    <li className="flex flex-col gap-3 rounded-lg border border-border p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <MonitorSmartphoneIcon
          className="mt-0.5 size-5 text-muted-foreground"
          aria-hidden="true"
        />
        <div className="grid gap-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">
              Sessione
            </span>
            {session.current ? (
              <Badge variant="secondary" className="w-fit">
                Sessione attuale
              </Badge>
            ) : null}
          </div>
          <p className="text-xs leading-5 text-muted-foreground">
            Avviata il {formatDateTime(session.createdAt)}
            {session.lastSeenAt
              ? ` · Ultimo accesso ${formatDateTime(session.lastSeenAt)}`
              : ""}
            {` · Scade il ${formatDateTime(session.expiresAt)}`}
          </p>
        </div>
      </div>
      {session.current ? null : (
        <form action={revokeSessionAction} className="sm:shrink-0">
          <input type="hidden" name="nextPath" value={routes.accountSecurity} />
          <input type="hidden" name="sessionId" value={session.id} />
          <Button type="submit" variant="outline" size="sm">
            <LogOutIcon data-icon="inline-start" aria-hidden="true" />
            Revoca
          </Button>
        </form>
      )}
    </li>
  )
}

function formatDateTime(value: string) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat("it-IT", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date)
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
    "session-api": "Non e' stato possibile revocare la sessione.",
    "session-invalid": "Sessione non valida.",
    "session-revoked": "Sessione revocata.",
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
