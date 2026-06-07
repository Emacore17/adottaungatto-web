"use client"

import { useState } from "react"

import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"

type AgeUnit = "months" | "years"

type DraftAgeFieldProps = {
  defaultAgeMonths?: number | null
}

function DraftAgeField({ defaultAgeMonths }: DraftAgeFieldProps) {
  const initial = getInitialAgeInput(defaultAgeMonths)
  const [unit, setUnit] = useState<AgeUnit>(initial.unit)

  return (
    <Field className="md:col-span-2">
      <FieldLabel htmlFor="ageValue">Eta</FieldLabel>
      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_11rem]">
        <Input
          id="ageValue"
          name="ageValue"
          type="number"
          min={0}
          max={unit === "years" ? 30 : 360}
          step={unit === "years" ? 0.5 : 1}
          inputMode="decimal"
          defaultValue={initial.value}
        />
        <Select
          name="ageUnit"
          value={unit}
          onValueChange={(value) => setUnit(value as AgeUnit)}
        >
          <SelectTrigger aria-label="Unita eta">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="months">Mesi</SelectItem>
            <SelectItem value="years">Anni</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <FieldDescription>
        Indica una sola eta; scegli mesi per cuccioli o mezzi anni.
      </FieldDescription>
    </Field>
  )
}

function getInitialAgeInput(ageMonths: number | null | undefined): {
  unit: AgeUnit
  value: string
} {
  if (ageMonths === null || ageMonths === undefined) {
    return {
      unit: "months",
      value: "",
    }
  }

  if (ageMonths >= 12 && ageMonths % 12 === 0) {
    return {
      unit: "years",
      value: String(ageMonths / 12),
    }
  }

  return {
    unit: "months",
    value: String(ageMonths),
  }
}

export { DraftAgeField }
