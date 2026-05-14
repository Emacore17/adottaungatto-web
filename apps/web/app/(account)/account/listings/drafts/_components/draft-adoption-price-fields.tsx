"use client"

import { useState } from "react"

import { Checkbox } from "@workspace/ui/components/checkbox"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
} from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"

type DraftAdoptionPriceFieldsProps = {
  defaultContributionCents?: number | null
  defaultIsFree?: boolean
}

function DraftAdoptionPriceFields({
  defaultContributionCents,
  defaultIsFree = true,
}: DraftAdoptionPriceFieldsProps) {
  const [isFree, setIsFree] = useState(defaultIsFree)

  return (
    <>
      <Field orientation="horizontal" className="md:col-span-2">
        <Checkbox
          id="isFree"
          name="isFree"
          value="true"
          checked={isFree}
          onCheckedChange={(checked) => setIsFree(checked === true)}
        />
        <FieldContent>
          <FieldLabel htmlFor="isFree">Adozione gratuita</FieldLabel>
          <FieldDescription>
            Se disattivi questa opzione devi indicare un prezzo.
          </FieldDescription>
        </FieldContent>
      </Field>

      {!isFree ? (
        <Field className="md:col-span-2">
          <FieldLabel htmlFor="contributionEuro">Prezzo</FieldLabel>
          <Input
            id="contributionEuro"
            name="contributionEuro"
            type="number"
            min={0.01}
            max={5000}
            step="0.01"
            inputMode="decimal"
            defaultValue={formatPriceEuro(defaultContributionCents)}
            required
          />
          <FieldDescription>Importo in euro.</FieldDescription>
        </Field>
      ) : null}
    </>
  )
}

function formatPriceEuro(value: number | null | undefined) {
  if (!value) {
    return ""
  }

  return String(value / 100)
}

export { DraftAdoptionPriceFields }
