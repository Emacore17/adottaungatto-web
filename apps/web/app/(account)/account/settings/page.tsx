import Link from "next/link"
import {
  BellIcon,
  CheckCircle2Icon,
  MailIcon,
  PhoneIcon,
  UserIcon,
} from "lucide-react"

import {
  updateNotificationPreferencesAction,
  updateProfileAction,
} from "@/app/(account)/account/actions"
import { requireAccountSession } from "@/app/(account)/account/_lib/session"
import { getCurrentUserProfile, type CurrentUserProfile } from "@/lib/api/users"
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
import { Checkbox } from "@workspace/ui/components/checkbox"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"

type AccountSettingsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function AccountSettingsPage({
  searchParams,
}: AccountSettingsPageProps) {
  const params = await searchParams
  const status = readSettingsStatus(params.settings)
  const { token } = await requireAccountSession(routes.accountSettings)
  const profile = await getCurrentUserProfile(token)

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div className="flex flex-col gap-3">
          <Badge variant="secondary" className="w-fit">
            Impostazioni
          </Badge>
          <div className="grid gap-2">
            <h1 className="text-3xl font-semibold tracking-normal">
              Profilo e preferenze
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
              Gestisci i dati personali usati nelle richieste e nelle
              comunicazioni della piattaforma.
            </p>
          </div>
        </div>
        <Button asChild variant="outline">
          <Link href={routes.account}>Torna alla dashboard</Link>
        </Button>
      </div>

      <SettingsFeedback status={status} />

      {profile.ok ? (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <section className="flex flex-col gap-6">
            <ProfileForm profile={profile.data} />
            <NotificationPreferencesForm profile={profile.data} />
          </section>

          <aside className="flex flex-col gap-4">
            <ProfileSummary profile={profile.data} />
          </aside>
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Impostazioni non disponibili</CardTitle>
            <CardDescription>{profile.message}</CardDescription>
          </CardHeader>
        </Card>
      )}
    </main>
  )
}

function ProfileForm({ profile }: { profile: CurrentUserProfile }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Dati personali</CardTitle>
        <CardDescription>
          Nome visibile e telefono sono usati solo nei flussi autenticati e
          secondo i consensi di contatto.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={updateProfileAction} className="flex flex-col gap-6">
          <input type="hidden" name="nextPath" value={routes.accountSettings} />
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="displayName">Nome visualizzato</FieldLabel>
              <Input
                id="displayName"
                name="displayName"
                defaultValue={profile.displayName}
                minLength={2}
                maxLength={80}
                required
              />
              <FieldDescription>
                Compare nelle tue aree riservate e come riferimento proprietario
                sugli annunci.
              </FieldDescription>
            </Field>

            <Field>
              <FieldLabel htmlFor="phoneE164">Telefono</FieldLabel>
              <Input
                id="phoneE164"
                name="phoneE164"
                defaultValue={profile.phoneE164 ?? ""}
                inputMode="tel"
                placeholder="+393331234567"
              />
              <FieldDescription>
                Formato internazionale. Lascia vuoto per rimuoverlo.
              </FieldDescription>
            </Field>
          </FieldGroup>

          <div className="flex justify-end">
            <Button type="submit">
              <CheckCircle2Icon data-icon="inline-start" aria-hidden="true" />
              Salva profilo
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

function NotificationPreferencesForm({
  profile,
}: {
  profile: CurrentUserProfile
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Preferenze email</CardTitle>
        <CardDescription>
          Scegli quali aggiornamenti non essenziali ricevere via email.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          action={updateNotificationPreferencesAction}
          className="flex flex-col gap-6"
        >
          <input type="hidden" name="nextPath" value={routes.accountSettings} />
          <FieldGroup>
            <Field orientation="horizontal">
              <Checkbox
                id="listingModerationDecisionEmail"
                name="listingModerationDecisionEmail"
                value="true"
                defaultChecked={
                  profile.notificationPreferences.listingModerationDecisionEmail
                }
              />
              <input
                type="hidden"
                name="listingModerationDecisionEmail"
                value="false"
              />
              <FieldContent>
                <FieldLabel htmlFor="listingModerationDecisionEmail">
                  Esiti moderazione annunci
                </FieldLabel>
                <FieldDescription>
                  Email quando un annuncio viene approvato, rifiutato o sospeso.
                </FieldDescription>
              </FieldContent>
            </Field>

            <Field orientation="horizontal">
              <Checkbox
                id="listingReportDecisionEmail"
                name="listingReportDecisionEmail"
                value="true"
                defaultChecked={
                  profile.notificationPreferences.listingReportDecisionEmail
                }
              />
              <input
                type="hidden"
                name="listingReportDecisionEmail"
                value="false"
              />
              <FieldContent>
                <FieldLabel htmlFor="listingReportDecisionEmail">
                  Esiti segnalazioni
                </FieldLabel>
                <FieldDescription>
                  Email quando una segnalazione collegata a un annuncio viene
                  gestita.
                </FieldDescription>
              </FieldContent>
            </Field>
          </FieldGroup>

          <div className="flex justify-end">
            <Button type="submit" variant="outline">
              <BellIcon data-icon="inline-start" aria-hidden="true" />
              Salva preferenze
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

function ProfileSummary({ profile }: { profile: CurrentUserProfile }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Riepilogo</CardTitle>
        <CardDescription>{profile.email}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 text-sm">
        <InfoRow
          icon={UserIcon}
          label="Tipo profilo"
          value={profile.profileType}
        />
        <InfoRow icon={MailIcon} label="Email" value={profile.email} />
        <InfoRow
          icon={PhoneIcon}
          label="Telefono"
          value={profile.phoneE164 ?? "Non impostato"}
        />
        <InfoRow label="Stato" value={profile.status} />
      </CardContent>
    </Card>
  )
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon?: typeof UserIcon
  label: string
  value: string
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="flex items-center gap-1.5 text-muted-foreground">
        {Icon ? <Icon data-icon="inline-start" aria-hidden="true" /> : null}
        {label}
      </span>
      <span className="max-w-40 text-right break-words">{value}</span>
    </div>
  )
}

function SettingsFeedback({
  status,
}: {
  status:
    | "invalid-notifications"
    | "invalid-profile"
    | "notifications-api"
    | "notifications-saved"
    | "profile-api"
    | "profile-saved"
    | null
}) {
  if (!status) {
    return null
  }

  const message = {
    "invalid-notifications": "Controlla le preferenze email selezionate.",
    "invalid-profile": "Controlla nome e telefono prima di salvare.",
    "notifications-api": "Non e' stato possibile salvare le preferenze.",
    "notifications-saved": "Preferenze email aggiornate.",
    "profile-api": "Non e' stato possibile salvare il profilo.",
    "profile-saved": "Profilo aggiornato.",
  }[status]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Stato impostazioni</CardTitle>
        <CardDescription>{message}</CardDescription>
      </CardHeader>
    </Card>
  )
}

function readSettingsStatus(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value

  if (
    raw === "invalid-notifications" ||
    raw === "invalid-profile" ||
    raw === "notifications-api" ||
    raw === "notifications-saved" ||
    raw === "profile-api" ||
    raw === "profile-saved"
  ) {
    return raw
  }

  return null
}
