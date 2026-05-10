"use client"

import { useState } from "react"

import { PlaceAutocompleteInput } from "@/app/(public)/_components/place-autocomplete-input"
import type { PlaceAutocompleteItem } from "@/lib/api/places"

type DraftMunicipalityFieldProps = {
  initialPlace: PlaceAutocompleteItem | null
  name?: string
}

function DraftMunicipalityField({
  initialPlace,
  name = "municipalityId",
}: DraftMunicipalityFieldProps) {
  const [selectedPlace, setSelectedPlace] =
    useState<PlaceAutocompleteItem | null>(initialPlace)
  const municipalityId =
    selectedPlace?.type === "municipality" ? selectedPlace.id : ""

  return (
    <>
      <PlaceAutocompleteInput
        ariaLabel="Comune"
        onSelect={setSelectedPlace}
        placeholder="Comune"
        selectedPlace={selectedPlace}
        type="municipality"
      />
      <input name={name} type="hidden" value={municipalityId} />
    </>
  )
}

export { DraftMunicipalityField }
