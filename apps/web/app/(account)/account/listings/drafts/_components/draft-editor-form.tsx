import { SaveIcon } from "lucide-react"

import {
  createDraftAction,
  updateDraftAction,
} from "@/app/(account)/account/actions"
import { DraftAdoptionPriceFields } from "@/app/(account)/account/listings/drafts/_components/draft-adoption-price-fields"
import { DraftAgeField } from "@/app/(account)/account/listings/drafts/_components/draft-age-field"
import { DraftInitialImageField } from "@/app/(account)/account/listings/drafts/_components/draft-initial-image-field"
import { DraftMunicipalityField } from "@/app/(account)/account/listings/drafts/_components/draft-municipality-field"
import type { ListingDraft } from "@/lib/api/account"
import type { PlaceAutocompleteItem } from "@/lib/api/places"
import type { PublicCatBreed } from "@/lib/api/types"
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
  NativeSelect,
  NativeSelectOption,
} from "@workspace/ui/components/native-select"
import { Textarea } from "@workspace/ui/components/textarea"

type DraftEditorFormProps = {
  breeds: PublicCatBreed[]
  draft?: ListingDraft
}

const booleanSelectOptions = [
  { label: "Non indicato", value: "" },
  { label: "Si", value: "true" },
  { label: "No", value: "false" },
] as const

function DraftEditorForm({ breeds, draft }: DraftEditorFormProps) {
  const isEditing = Boolean(draft)
  const action = draft ? updateDraftAction : createDraftAction
  const currentPath = draft
    ? routes.accountDraft(draft.id)
    : routes.accountDraftNew
  const initialPlace = createInitialMunicipalityPlace(draft)

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {isEditing ? "Modifica annuncio" : "Dati dell'annuncio"}
        </CardTitle>
        <CardDescription>Resta privato fino alla revisione.</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          action={action}
          className="grid gap-8"
          encType="multipart/form-data"
        >
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
                  <NativeSelect
                    id="sex"
                    name="sex"
                    defaultValue={draft?.sex ?? "unknown"}
                    className="w-full"
                  >
                    <NativeSelectOption value="unknown">
                      Non indicato
                    </NativeSelectOption>
                    <NativeSelectOption value="female">
                      Femmina
                    </NativeSelectOption>
                    <NativeSelectOption value="male">
                      Maschio
                    </NativeSelectOption>
                  </NativeSelect>
                </Field>

                <Field>
                  <FieldLabel htmlFor="breedId">Razza</FieldLabel>
                  <NativeSelect
                    id="breedId"
                    name="breedId"
                    defaultValue={draft?.breed?.id ?? ""}
                    className="w-full"
                  >
                    <NativeSelectOption value="">
                      Non indicata
                    </NativeSelectOption>
                    {breeds.map((breed) => (
                      <NativeSelectOption key={breed.id} value={breed.id}>
                        {breed.name}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
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
            </FieldSet>
          </FieldGroup>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button type="submit">
              <SaveIcon data-icon="inline-start" aria-hidden="true" />
              {isEditing ? "Salva modifiche" : "Crea annuncio"}
            </Button>
          </div>
        </form>
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
      <NativeSelect
        id={id}
        name={id}
        defaultValue={formatNullableBoolean(value)}
        className="w-full"
      >
        {booleanSelectOptions.map((option) => (
          <NativeSelectOption key={option.value} value={option.value}>
            {option.label}
          </NativeSelectOption>
        ))}
      </NativeSelect>
    </Field>
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

  return ""
}

export { DraftEditorForm }
