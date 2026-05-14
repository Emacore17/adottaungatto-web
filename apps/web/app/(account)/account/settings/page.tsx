import Link from "next/link"
import {
  BellIcon,
  BadgeCheckIcon,
  CheckCircle2Icon,
  ArrowRightIcon,
  LockKeyholeIcon,
  MailIcon,
  PhoneIcon,
  SendIcon,
  ShieldCheckIcon,
  UserIcon,
  XCircleIcon,
} from "lucide-react"

import {
  confirmPhoneVerificationAction,
  requestPhoneVerificationAction,
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
import {
  NativeSelect,
  NativeSelectOption,
} from "@workspace/ui/components/native-select"
import { Separator } from "@workspace/ui/components/separator"
import { phoneCountryCodes, splitPhoneNumber } from "@/lib/phone"

type AccountSettingsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function AccountSettingsPage({
  searchParams,
}: AccountSettingsPageProps) {
  const params = await searchParams
  const status = readSettingsStatus(params.settings)
  const phoneCode =
    typeof params.phoneCode === "string" && params.phoneCode.length === 6
      ? params.phoneCode
      : null
  const { token } = await requireAccountSession(routes.accountSettings)
  const profile = await getCurrentUserProfile(token)

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div className="flex flex-col gap-3">
          <Badge
            variant="outline"
            className="w-fit border-brand-teal/25 bg-brand-teal-soft text-brand-teal-ink"
          >
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

      <SettingsFeedback status={status} phoneCode={phoneCode} />

      {profile.ok ? (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <section className="flex flex-col gap-6">
            <ProfileForm profile={profile.data} />
            <NotificationPreferencesForm profile={profile.data} />
          </section>

          <aside className="flex flex-col gap-4">
            <ProfileSummary profile={profile.data} />
            <AccountSectionsCard />
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
  const phoneParts = splitPhoneNumber(profile.phoneE164)
  const phoneVerified = Boolean(profile.phoneVerifiedAt)

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
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div className="grid gap-1">
                  <FieldLabel htmlFor="phoneNationalNumber">
                    Telefono
                  </FieldLabel>
                  <FieldDescription>
                    Prefisso e numero. Lascia vuoto per rimuoverlo.
                  </FieldDescription>
                </div>
                {profile.phoneE164 ? (
                  <Badge
                    variant={phoneVerified ? "secondary" : "outline"}
                    className={
                      phoneVerified
                        ? "w-fit bg-brand-teal-soft text-brand-teal-ink"
                        : "w-fit"
                    }
                  >
                    {phoneVerified ? (
                      <BadgeCheckIcon
                        aria-hidden="true"
                        data-icon="inline-start"
                      />
                    ) : (
                      <XCircleIcon
                        aria-hidden="true"
                        data-icon="inline-start"
                      />
                    )}
                    {phoneVerified ? "Verificato" : "Da verificare"}
                  </Badge>
                ) : null}
              </div>
              <div className="grid gap-2 sm:grid-cols-[9rem_minmax(0,1fr)]">
                <NativeSelect
                  name="phoneCountryCode"
                  aria-label="Prefisso internazionale"
                  className="w-full"
                  defaultValue={phoneParts.countryCode}
                >
                  {phoneCountryCodes.map((country) => (
                    <NativeSelectOption key={country.code} value={country.code}>
                      {country.label}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
                <Input
                  id="phoneNationalNumber"
                  name="phoneNationalNumber"
                  defaultValue={phoneParts.nationalNumber}
                  inputMode="tel"
                  autoComplete="tel-national"
                  placeholder="3331234567"
                />
              </div>
            </Field>

            <Field orientation="horizontal">
              <Checkbox
                id="showPhoneOnListings"
                name="showPhoneOnListings"
                value="true"
                defaultChecked={profile.showPhoneOnListings}
                disabled={!profile.phoneE164}
              />
              <FieldContent>
                <FieldLabel htmlFor="showPhoneOnListings">
                  Usa questo telefono nei nuovi annunci
                </FieldLabel>
                <FieldDescription>
                  Viene mostrato solo dopo verifica. Puoi cambiarlo per ogni
                  annuncio.
                </FieldDescription>
              </FieldContent>
            </Field>
          </FieldGroup>

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            {profile.phoneE164 ? (
              <Button
                type="submit"
                name="phoneIntent"
                value="remove"
                variant="outline"
              >
                <PhoneIcon data-icon="inline-start" aria-hidden="true" />
                Rimuovi telefono
              </Button>
            ) : null}
            <Button type="submit">
              <CheckCircle2Icon data-icon="inline-start" aria-hidden="true" />
              Salva profilo
            </Button>
          </div>
        </form>
        {profile.phoneE164 && !phoneVerified ? (
          <div className="mt-6 grid gap-3 rounded-md border border-brand-teal/18 bg-brand-teal-soft/55 p-4">
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium text-brand-teal-ink">
                Verifica telefono
              </p>
              <p className="text-sm text-muted-foreground">
                Richiedi il codice e inserisci le 6 cifre ricevute.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-[auto_minmax(0,1fr)]">
              <form action={requestPhoneVerificationAction}>
                <input
                  type="hidden"
                  name="nextPath"
                  value={routes.accountSettings}
                />
                <Button type="submit" variant="outline">
                  <SendIcon data-icon="inline-start" aria-hidden="true" />
                  Invia codice
                </Button>
              </form>
              <form
                action={confirmPhoneVerificationAction}
                className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]"
              >
                <input
                  type="hidden"
                  name="nextPath"
                  value={routes.accountSettings}
                />
                <Input
                  name="code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="\d{6}"
                  maxLength={6}
                  placeholder="123456"
                />
                <Button type="submit">
                  <BadgeCheckIcon data-icon="inline-start" aria-hidden="true" />
                  Verifica
                </Button>
              </form>
            </div>
          </div>
        ) : null}
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

function AccountSectionsCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Sicurezza account</CardTitle>
        <CardDescription>
          Password e azioni critiche sono separate.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 text-sm">
        <Button asChild variant="outline" className="justify-between">
          <Link href={routes.accountSecurity}>
            <span className="inline-flex items-center gap-2">
              <LockKeyholeIcon data-icon="inline-start" aria-hidden="true" />
              Cambia password
            </span>
            <ArrowRightIcon data-icon="inline-end" aria-hidden="true" />
          </Link>
        </Button>
        <Button asChild variant="outline" className="justify-between">
          <Link href={routes.accountDanger}>
            <span className="inline-flex items-center gap-2">
              <ShieldCheckIcon data-icon="inline-start" aria-hidden="true" />
              Gestione account
            </span>
            <ArrowRightIcon data-icon="inline-end" aria-hidden="true" />
          </Link>
        </Button>
        <Separator />
        <p className="text-muted-foreground">
          Le operazioni critiche chiedono sempre la password attuale.
        </p>
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
  phoneCode,
  status,
}: {
  phoneCode: string | null
  status:
    | "account-api"
    | "account-confirm-invalid"
    | "account-password-invalid"
    | "invalid-notifications"
    | "invalid-password"
    | "invalid-profile"
    | "notifications-api"
    | "notifications-saved"
    | "password-api"
    | "password-current"
    | "password-mismatch"
    | "password-saved"
    | "phone-already-verified"
    | "phone-code-api"
    | "phone-code-invalid"
    | "phone-code-sent"
    | "phone-verified"
    | "profile-api"
    | "profile-saved"
    | null
}) {
  if (!status) {
    return null
  }

  const message = {
    "account-api": "Non e' stato possibile aggiornare lo stato account.",
    "account-confirm-invalid": "Scrivi ELIMINA per confermare.",
    "account-password-invalid": "Password non valida per questa operazione.",
    "invalid-notifications": "Controlla le preferenze email selezionate.",
    "invalid-password": "Controlla la nuova password prima di salvare.",
    "invalid-profile": "Controlla nome e telefono prima di salvare.",
    "notifications-api": "Non e' stato possibile salvare le preferenze.",
    "notifications-saved": "Preferenze email aggiornate.",
    "password-api": "Non e' stato possibile cambiare password.",
    "password-current": "La password attuale non e' corretta.",
    "password-mismatch": "Le nuove password non coincidono.",
    "password-saved": "Password aggiornata e sessione ruotata.",
    "phone-already-verified": "Il telefono e' gia' verificato.",
    "phone-code-api": "Non e' stato possibile inviare il codice.",
    "phone-code-invalid": "Codice telefono non valido o scaduto.",
    "phone-code-sent": phoneCode
      ? `Codice inviato. In demo locale usa ${phoneCode}.`
      : "Codice inviato al telefono.",
    "phone-verified": "Telefono verificato.",
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
    raw === "account-api" ||
    raw === "account-confirm-invalid" ||
    raw === "account-password-invalid" ||
    raw === "invalid-notifications" ||
    raw === "invalid-password" ||
    raw === "invalid-profile" ||
    raw === "notifications-api" ||
    raw === "notifications-saved" ||
    raw === "password-api" ||
    raw === "password-current" ||
    raw === "password-mismatch" ||
    raw === "password-saved" ||
    raw === "phone-already-verified" ||
    raw === "phone-code-api" ||
    raw === "phone-code-invalid" ||
    raw === "phone-code-sent" ||
    raw === "phone-verified" ||
    raw === "profile-api" ||
    raw === "profile-saved"
  ) {
    return raw
  }

  return null
}
