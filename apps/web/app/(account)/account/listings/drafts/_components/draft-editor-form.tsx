import { PhoneIcon, SaveIcon, ShieldCheckIcon } from "lucide-react"

import {
  confirmDraftPhoneVerificationAction,
  createDraftAction,
  requestDraftPhoneVerificationAction,
  updateDraftAction,
} from "@/app/(account)/account/actions"
import { DraftAdoptionPriceFields } from "@/app/(account)/account/listings/drafts/_components/draft-adoption-price-fields"
import { DraftAgeField } from "@/app/(account)/account/listings/drafts/_components/draft-age-field"
import { DraftInitialImageField } from "@/app/(account)/account/listings/drafts/_components/draft-initial-image-field"
import { DraftMunicipalityField } from "@/app/(account)/account/listings/drafts/_components/draft-municipality-field"
import type { ListingDraft } from "@/lib/api/account"
import type { PlaceAutocompleteItem } from "@/lib/api/places"
import type { PublicCatBreed } from "@/lib/api/types"
import type { CurrentUserProfile } from "@/lib/api/users"
import { phoneCountryCodes, splitPhoneNumber } from "@/lib/phone"
import { routes } from "@/lib/routes"
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
  FieldLegend,
  FieldSet,
} from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { Textarea } from "@workspace/ui/components/textarea"

type DraftEditorFormProps = {
  breeds: PublicCatBreed[]
  draft?: ListingDraft
  profile?: CurrentUserProfile | null
}

const booleanSelectOptions = [
  { label: "Non indicato", value: "__none__" },
  { label: "Si", value: "true" },
  { label: "No", value: "false" },
] as const

function DraftEditorForm({ breeds, draft, profile }: DraftEditorFormProps) {
  const isEditing = Boolean(draft)
  const action = draft ? updateDraftAction : createDraftAction
  const currentPath = draft
    ? routes.accountDraft(draft.id)
    : routes.accountDraftNew
  const initialPlace = createInitialMunicipalityPlace(draft)
  const accountPhoneReady = Boolean(
    profile?.phoneE164 && profile.phoneVerifiedAt
  )
  const defaultContactPhoneMode =
    draft?.contactPhone.mode ??
    (accountPhoneReady && profile?.showPhoneOnListings ? "account" : "none")
  const listingPhone = splitPhoneNumber(draft?.contactPhone.phoneE164 ?? null)

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {isEditing ? "Modifica annuncio" : "Dati dell'annuncio"}
        </CardTitle>
        <CardDescription>Resta privato fino alla revisione.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="grid gap-8">
          <input name="nextPath" type="hidden" value={currentPath} />
          {draft ? (
            <input name="draftId" type="hidden" value={draft.id} />
          ) : null}

          <FieldGroup>
            <FieldSet>
              <FieldLegend>Annuncio</FieldLegend>
              <div className="grid gap-4">
                <Field>
                  <FieldLabel htmlFor="title">Titolo</FieldLabel>
                  <Input
                    id="title"
                    name="title"
                    defaultValue={draft?.title ?? ""}
                    maxLength={120}
                    minLength={3}
                    required
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="description">Descrizione</FieldLabel>
                  <Textarea
                    id="description"
                    name="description"
                    defaultValue={draft?.description ?? ""}
                    maxLength={5000}
                    minLength={10}
                    required
                    rows={7}
                  />
                  <FieldDescription>
                    Scrivi carattere, bisogni e condizioni di adozione.
                  </FieldDescription>
                </Field>
              </div>
            </FieldSet>

            <FieldSet>
              <FieldLegend>Dettagli gatto</FieldLegend>
              <div className="grid gap-4 md:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="sex">Sesso</FieldLabel>
                  <Select name="sex" defaultValue={draft?.sex ?? "unknown"}>
                    <SelectTrigger id="sex" aria-label="Sesso">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unknown">Non indicato</SelectItem>
                      <SelectItem value="female">Femmina</SelectItem>
                      <SelectItem value="male">Maschio</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>

                <Field>
                  <FieldLabel htmlFor="breedId">Razza</FieldLabel>
                  <Select
                    name="breedId"
                    defaultValue={draft?.breed?.id ?? "__none__"}
                  >
                    <SelectTrigger id="breedId" aria-label="Razza">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Non indicata</SelectItem>
                      {breeds.map((breed) => (
                        <SelectItem key={breed.id} value={breed.id}>
                          {breed.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <DraftAgeField defaultAgeMonths={draft?.ageMonths} />
              </div>
            </FieldSet>

            <FieldSet>
              <FieldLegend>Luogo e adozione</FieldLegend>
              <div className="grid gap-4 md:grid-cols-2">
                <Field>
                  <FieldLabel>Comune</FieldLabel>
                  <DraftMunicipalityField initialPlace={initialPlace} />
                </Field>

                <DraftAdoptionPriceFields
                  defaultContributionCents={draft?.contributionCents}
                  defaultIsFree={draft?.isFree ?? true}
                />
              </div>
            </FieldSet>

            <FieldSet>
              <FieldLegend>Stato sanitario</FieldLegend>
              <div className="grid gap-4 md:grid-cols-2">
                <BooleanSelectField
                  id="isVaccinated"
                  label="Vaccinato"
                  value={draft?.isVaccinated}
                />
                <BooleanSelectField
                  id="isSterilized"
                  label="Sterilizzato"
                  value={draft?.isSterilized}
                />
                <BooleanSelectField
                  id="isDewormed"
                  label="Sverminato"
                  value={draft?.isDewormed}
                />
                <BooleanSelectField
                  id="hasMicrochip"
                  label="Microchip"
                  value={draft?.hasMicrochip}
                />
              </div>
            </FieldSet>

            {!isEditing ? (
              <FieldSet>
                <FieldLegend>Foto</FieldLegend>
                <DraftInitialImageField />
              </FieldSet>
            ) : null}

            <FieldSet>
              <FieldLegend>Contatto</FieldLegend>
              <div className="grid gap-5">
                <Field orientation="horizontal">
                  <Checkbox
                    id="contactRequestsEnabled"
                    name="contactRequestsEnabled"
                    value="true"
                    defaultChecked={draft?.contactRequestsEnabled ?? true}
                  />
                  <FieldContent>
                    <FieldLabel htmlFor="contactRequestsEnabled">
                      Accetta richieste di contatto
                    </FieldLabel>
                    <FieldDescription>
                      Mostra il form pubblico e ricevi richieste via email.
                    </FieldDescription>
                  </FieldContent>
                </Field>

                <div className="rounded-md border border-border bg-secondary/40 p-4">
                  <div className="grid gap-4">
                    <Field>
                      <FieldLabel htmlFor="contactPhoneMode">
                        Telefono nell&apos;annuncio
                      </FieldLabel>
                      <Select
                        name="contactPhoneMode"
                        defaultValue={defaultContactPhoneMode}
                      >
                        <SelectTrigger
                          id="contactPhoneMode"
                          aria-label="Telefono annuncio"
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">
                            Non mostrare telefono
                          </SelectItem>
                          <SelectItem
                            value="account"
                            disabled={!accountPhoneReady}
                          >
                            Usa telefono account
                          </SelectItem>
                          <SelectItem value="listing">
                            Usa telefono solo per questo annuncio
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FieldDescription>
                        Il numero diventa pubblico solo dopo la verifica.
                      </FieldDescription>
                    </Field>

                    {!accountPhoneReady ? (
                      <p className="rounded-md border border-border bg-secondary px-3 py-2 text-sm text-foreground">
                        Per usare il telefono account devi prima aggiungerlo e
                        verificarlo nel profilo.
                      </p>
                    ) : null}

                    <div className="grid gap-3 sm:grid-cols-[9rem_minmax(0,1fr)]">
                      <Field>
                        <FieldLabel htmlFor="listingPhoneCountryCode">
                          Prefisso
                        </FieldLabel>
                        <Select
                          name="listingPhoneCountryCode"
                          defaultValue={listingPhone.countryCode}
                        >
                          <SelectTrigger
                            id="listingPhoneCountryCode"
                            aria-label="Prefisso"
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {phoneCountryCodes.map((country) => (
                              <SelectItem
                                key={country.code}
                                value={country.code}
                              >
                                {country.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Field>
                      <Field>
                        <FieldLabel htmlFor="listingPhoneNationalNumber">
                          Numero per questo annuncio
                        </FieldLabel>
                        <Input
                          id="listingPhoneNationalNumber"
                          name="listingPhoneNationalNumber"
                          defaultValue={listingPhone.nationalNumber}
                          inputMode="tel"
                          maxLength={20}
                          placeholder="3331234567"
                        />
                      </Field>
                    </div>

                    {!profile?.phoneE164 ? (
                      <Field orientation="horizontal">
                        <Checkbox
                          id="saveListingPhoneToAccount"
                          name="saveListingPhoneToAccount"
                          value="true"
                        />
                        <FieldContent>
                          <FieldLabel htmlFor="saveListingPhoneToAccount">
                            Aggiungi questo numero anche all&apos;account
                          </FieldLabel>
                          <FieldDescription>
                            Lo salvi nel profilo, poi lo verifichi dalle
                            impostazioni account.
                          </FieldDescription>
                        </FieldContent>
                      </Field>
                    ) : null}
                  </div>
                </div>
              </div>
            </FieldSet>
          </FieldGroup>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button type="submit">
              <SaveIcon data-icon="inline-start" aria-hidden="true" />
              {isEditing ? "Salva modifiche" : "Crea annuncio"}
            </Button>
          </div>
        </form>
        {draft?.contactPhone.mode === "listing" ? (
          <ListingPhoneVerificationPanel draft={draft} nextPath={currentPath} />
        ) : null}
      </CardContent>
    </Card>
  )
}

function BooleanSelectField({
  id,
  label,
  value,
}: {
  id: string
  label: string
  value: boolean | null | undefined
}) {
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Select name={id} defaultValue={formatNullableBoolean(value)}>
        <SelectTrigger id={id} aria-label={label}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {booleanSelectOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  )
}

function ListingPhoneVerificationPanel({
  draft,
  nextPath,
}: {
  draft: ListingDraft
  nextPath: string
}) {
  const isVerified = Boolean(draft.contactPhone.phoneVerifiedAt)

  return (
    <div className="mt-6 grid gap-4 rounded-md border border-border bg-emerald-50 p-4">
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-background text-foreground">
          {isVerified ? (
            <ShieldCheckIcon className="size-4" aria-hidden="true" />
          ) : (
            <PhoneIcon className="size-4" aria-hidden="true" />
          )}
        </span>
        <div className="grid gap-1 text-sm">
          <p className="font-medium text-foreground">
            {isVerified ? "Telefono verificato" : "Verifica telefono annuncio"}
          </p>
          <p className="text-muted-foreground">
            {isVerified
              ? "Questo numero puo essere mostrato quando l'annuncio sara pubblicato."
              : "Invia il codice, poi inseriscilo qui. In locale il codice compare anche nel messaggio di stato."}
          </p>
        </div>
      </div>

      {!isVerified ? (
        <div className="grid gap-3 sm:grid-cols-[auto_minmax(0,1fr)]">
          <form action={requestDraftPhoneVerificationAction}>
            <input name="draftId" type="hidden" value={draft.id} />
            <input name="nextPath" type="hidden" value={nextPath} />
            <Button type="submit" variant="outline">
              Invia codice
            </Button>
          </form>
          <form
            action={confirmDraftPhoneVerificationAction}
            className="flex flex-col gap-2 sm:flex-row"
          >
            <input name="draftId" type="hidden" value={draft.id} />
            <input name="nextPath" type="hidden" value={nextPath} />
            <Input
              name="code"
              inputMode="numeric"
              maxLength={6}
              minLength={6}
              placeholder="123456"
              required
            />
            <Button type="submit">Verifica</Button>
          </form>
        </div>
      ) : null}
    </div>
  )
}

function createInitialMunicipalityPlace(
  draft: ListingDraft | undefined
): PlaceAutocompleteItem | null {
  const location = draft?.location

  if (!location) {
    return null
  }

  return {
    center: location.center ?? null,
    hierarchy: {
      province: location.province,
      region: location.region,
    },
    id: location.municipality.id,
    istatCode: location.municipality.istatCode,
    label: location.municipality.name,
    subtitle: `${location.province.name}, ${location.region.name}`,
    type: "municipality",
  }
}

function formatNullableBoolean(value: boolean | null | undefined) {
  if (value === true) {
    return "true"
  }

  if (value === false) {
    return "false"
  }

  return "__none__"
}

export { DraftEditorForm }
