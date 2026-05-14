"use client"

import { useMemo, useState } from "react"
import {
  LocateFixedIcon,
  SearchIcon,
  SlidersHorizontalIcon,
  XIcon,
} from "lucide-react"
import type { ListingPublicListQuery } from "@workspace/validation/listings"
import type { PlaceAutocompleteType } from "@workspace/validation/places"

import {
  booleanFilterOptions,
  radiusOptions,
  sexOptions,
  sortOptions,
} from "@/app/(public)/_components/listing-search-options"
import { PlaceAutocompleteInput } from "@/app/(public)/_components/place-autocomplete-input"
import type { PublicCatBreed } from "@/lib/api/types"
import type { PlaceAutocompleteItem } from "@/lib/api/places"
import { routes } from "@/lib/routes"
import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

type ListingSearchDefaults = Partial<ListingPublicListQuery> & {
  placeLabel?: string | null
  placeType?: PlaceAutocompleteType | "position" | null
}

type ListingSearchFormProps = {
  breeds?: PublicCatBreed[]
  defaultValues?: ListingSearchDefaults
}

type BooleanFilterKey = (typeof booleanFilterOptions)[number]["key"]

type Coordinates = {
  lat: number
  lng: number
}

type SearchFilters = {
  breedId: string
  sex: string
  ageMonthsMin: string
  ageMonthsMax: string
  contributionEurosMin: string
  contributionEurosMax: string
  priceMode: "all" | "free" | "range"
  sort: ListingPublicListQuery["sort"]
  radiusKm: string
} & Record<BooleanFilterKey, boolean>

type RangeKey =
  | "ageMonthsMin"
  | "ageMonthsMax"
  | "contributionEurosMin"
  | "contributionEurosMax"

const maxCatAgeMonths = 360
const maxContributionEuros = 500

const controlClassName =
  "h-11 w-full rounded-lg border border-border bg-card/90 px-3 text-sm text-brand-ink outline-none transition-[border-color,box-shadow,background-color] focus:border-ring focus:bg-card focus:shadow-[0_0_0_3px_color-mix(in_oklab,var(--color-ring)_22%,transparent)] disabled:cursor-not-allowed disabled:bg-muted/55 disabled:text-muted-foreground"

const numberControlClassName =
  "h-10 w-full rounded-md border border-border bg-card/90 px-3 text-sm text-brand-ink outline-none transition-[border-color,box-shadow,background-color] focus:border-ring focus:bg-card focus:shadow-[0_0_0_3px_color-mix(in_oklab,var(--color-ring)_22%,transparent)] disabled:cursor-not-allowed disabled:bg-muted/55 disabled:text-muted-foreground"

const rangeControlClassName =
  "h-6 w-full cursor-pointer accent-primary disabled:cursor-not-allowed disabled:opacity-50"

const filterLabelClassName =
  "text-xs font-semibold tracking-normal text-muted-foreground uppercase"

function createInitialPriceMode(
  defaultValues: ListingSearchDefaults
): SearchFilters["priceMode"] {
  if (defaultValues.isFree === true) {
    return "free"
  }

  return defaultValues.contributionCentsMin !== undefined ||
    defaultValues.contributionCentsMax !== undefined
    ? "range"
    : "all"
}

function createDefaultPlace(
  defaultValues: ListingSearchDefaults
): PlaceAutocompleteItem | null {
  const type = defaultValues.placeType

  if (
    !defaultValues.placeLabel ||
    !type ||
    type === "position" ||
    !["municipality", "province", "region"].includes(type)
  ) {
    return null
  }

  const id =
    type === "municipality"
      ? defaultValues.municipalityId
      : type === "province"
        ? defaultValues.provinceId
        : defaultValues.regionId

  if (!id) {
    return null
  }

  return {
    center:
      defaultValues.lat !== undefined && defaultValues.lng !== undefined
        ? {
            lat: defaultValues.lat,
            lng: defaultValues.lng,
          }
        : null,
    hierarchy: {},
    id,
    istatCode: "",
    label: defaultValues.placeLabel,
    subtitle: "",
    type,
  }
}

function createInitialFilters(
  defaultValues: ListingSearchDefaults
): SearchFilters {
  return {
    ageMonthsMax:
      defaultValues.ageMonthsMax !== undefined
        ? String(defaultValues.ageMonthsMax)
        : "",
    ageMonthsMin:
      defaultValues.ageMonthsMin !== undefined
        ? String(defaultValues.ageMonthsMin)
        : "",
    hasImages: defaultValues.hasImages === true,
    hasMicrochip: defaultValues.hasMicrochip === true,
    isDewormed: defaultValues.isDewormed === true,
    isSterilized: defaultValues.isSterilized === true,
    isVaccinated: defaultValues.isVaccinated === true,
    breedId: defaultValues.breedId ?? "",
    contributionEurosMax:
      defaultValues.contributionCentsMax !== undefined
        ? String(defaultValues.contributionCentsMax / 100)
        : "",
    contributionEurosMin:
      defaultValues.contributionCentsMin !== undefined
        ? String(defaultValues.contributionCentsMin / 100)
        : "",
    priceMode: createInitialPriceMode(defaultValues),
    radiusKm:
      defaultValues.radiusKm !== undefined
        ? String(defaultValues.radiusKm)
        : "50",
    sex: defaultValues.sex ?? "",
    sort: defaultValues.sort ?? "relevance",
  }
}

function createInitialPosition(
  defaultValues: ListingSearchDefaults
): Coordinates | null {
  if (defaultValues.lat === undefined || defaultValues.lng === undefined) {
    return null
  }

  return {
    lat: defaultValues.lat,
    lng: defaultValues.lng,
  }
}

function getActiveFilterCount(
  filters: SearchFilters,
  position: Coordinates | null
) {
  const booleanCount = booleanFilterOptions.filter(
    (option) => filters[option.key]
  ).length

  return (
    booleanCount +
    (filters.breedId ? 1 : 0) +
    (filters.priceMode !== "all" ? 1 : 0) +
    (filters.sex ? 1 : 0) +
    (filters.ageMonthsMin || filters.ageMonthsMax ? 1 : 0) +
    (filters.sort && filters.sort !== "relevance" ? 1 : 0) +
    (position ? 1 : 0)
  )
}

function getSelectedPlaceHiddenName(place: PlaceAutocompleteItem) {
  if (place.type === "municipality") {
    return "municipalityId"
  }

  if (place.type === "province") {
    return "provinceId"
  }

  return "regionId"
}

function readNumericFilterValue(value: string) {
  if (!value.trim()) {
    return null
  }

  const parsed = Number(value)

  return Number.isFinite(parsed) ? parsed : null
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function clampRangeInput(value: string, max: number) {
  return clampNumber(Math.round(Number(value)), 0, max)
}

function formatNumberInput(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1)
}

function formatAgeMonths(months: number) {
  if (months === 0) {
    return "0 mesi"
  }

  if (months < 12) {
    return `${months} mesi`
  }

  const years = months / 12

  return `${formatNumberInput(years)} ${years === 1 ? "anno" : "anni"}`
}

function formatAgeRange(filters: SearchFilters) {
  const min = readNumericFilterValue(filters.ageMonthsMin)
  const max = readNumericFilterValue(filters.ageMonthsMax)

  if (min === null && max === null) {
    return "Qualsiasi eta"
  }

  if (min !== null && max !== null) {
    return `${formatAgeMonths(min)} - ${formatAgeMonths(max)}`
  }

  if (min !== null) {
    return `Da ${formatAgeMonths(min)}`
  }

  return `Fino a ${formatAgeMonths(max ?? maxCatAgeMonths)}`
}

function monthsToYearsInput(value: string) {
  const months = readNumericFilterValue(value)

  return months === null ? "" : formatNumberInput(months / 12)
}

function yearsToMonthsValue(value: string) {
  const years = readNumericFilterValue(value)

  if (years === null) {
    return ""
  }

  return String(Math.round(clampNumber(years, 0, 30) * 12))
}

function formatPriceRange(filters: SearchFilters) {
  if (filters.priceMode === "free") {
    return "Solo in regalo"
  }

  const min = readNumericFilterValue(filters.contributionEurosMin)
  const max = readNumericFilterValue(filters.contributionEurosMax)

  if (filters.priceMode === "all" || (min === null && max === null)) {
    return "Qualsiasi contributo"
  }

  if (min !== null && max !== null) {
    return `${min} - ${max} euro`
  }

  if (min !== null) {
    return `Da ${min} euro`
  }

  return `Fino a ${max ?? maxContributionEuros} euro`
}

function ListingSearchForm({
  breeds = [],
  defaultValues = {},
}: ListingSearchFormProps) {
  const [selectedPlace, setSelectedPlace] =
    useState<PlaceAutocompleteItem | null>(() =>
      createDefaultPlace(defaultValues)
    )
  const [filters, setFilters] = useState<SearchFilters>(() =>
    createInitialFilters(defaultValues)
  )
  const [position, setPosition] = useState<Coordinates | null>(() =>
    createInitialPosition(defaultValues)
  )
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [positionLoading, setPositionLoading] = useState(false)
  const [positionError, setPositionError] = useState<string | null>(null)
  const activeFilterCount = getActiveFilterCount(filters, position)
  const effectiveSort =
    filters.sort === "distance" && !position ? "relevance" : filters.sort
  const selectedBreedIsKnown = breeds.some(
    (breed) => breed.id === filters.breedId
  )

  const hiddenInputs = useMemo(() => {
    const entries: Array<[string, string]> = []

    if (selectedPlace) {
      entries.push([
        getSelectedPlaceHiddenName(selectedPlace),
        selectedPlace.id,
      ])
      entries.push(["placeLabel", selectedPlace.label])
      entries.push(["placeType", selectedPlace.type])
    }

    if (position) {
      entries.push(["lat", String(position.lat)])
      entries.push(["lng", String(position.lng)])
      entries.push(["radiusKm", filters.radiusKm])
      entries.push(["placeLabel", "La tua posizione"])
      entries.push(["placeType", "position"])
    }

    if (filters.breedId) {
      entries.push(["breedId", filters.breedId])
    }

    if (filters.priceMode === "free") {
      entries.push(["isFree", "true"])
    } else if (filters.priceMode === "range") {
      const min = readNumericFilterValue(filters.contributionEurosMin)
      const max = readNumericFilterValue(filters.contributionEurosMax)

      if (min !== null) {
        entries.push(["contributionCentsMin", String(min * 100)])
      }

      if (max !== null) {
        entries.push(["contributionCentsMax", String(max * 100)])
      }
    }

    if (filters.sex) {
      entries.push(["sex", filters.sex])
    }

    if (filters.ageMonthsMin) {
      entries.push(["ageMonthsMin", filters.ageMonthsMin])
    }

    if (filters.ageMonthsMax) {
      entries.push(["ageMonthsMax", filters.ageMonthsMax])
    }

    if (effectiveSort && effectiveSort !== "relevance") {
      entries.push(["sort", effectiveSort])
    }

    for (const option of booleanFilterOptions) {
      if (filters[option.key]) {
        entries.push([option.key, "true"])
      }
    }

    return entries
  }, [effectiveSort, filters, position, selectedPlace])

  function updateFilter<Key extends keyof SearchFilters>(
    key: Key,
    value: SearchFilters[Key]
  ) {
    setFilters((current) => {
      return {
        ...current,
        [key]: value,
      }
    })
  }

  function updateRangeFilter(
    minKey: RangeKey,
    maxKey: RangeKey,
    edge: "min" | "max",
    rawValue: string,
    maxAllowed: number
  ) {
    setFilters((current) => {
      const value =
        rawValue === "" ? "" : String(clampRangeInput(rawValue, maxAllowed))
      const next = { ...current }

      next[edge === "min" ? minKey : maxKey] = value

      const min = readNumericFilterValue(next[minKey])
      const max = readNumericFilterValue(next[maxKey])

      if (min !== null && max !== null && min > max) {
        if (edge === "min") {
          next[maxKey] = String(min)
        } else {
          next[minKey] = String(max)
        }
      }

      return next
    })
  }

  function handlePriceModeChange(mode: SearchFilters["priceMode"]) {
    setFilters((current) => ({
      ...current,
      contributionEurosMax:
        mode === "range" && current.contributionEurosMax === ""
          ? "200"
          : current.contributionEurosMax,
      priceMode: mode,
    }))
  }

  function handlePlaceSelect(place: PlaceAutocompleteItem | null) {
    setSelectedPlace(place)

    if (place) {
      setPosition(null)
      setPositionError(null)
    }
  }

  function useCurrentPosition() {
    if (!navigator.geolocation) {
      setPositionError("Posizione non supportata dal browser.")
      return
    }

    setPositionLoading(true)
    setPositionError(null)

    navigator.geolocation.getCurrentPosition(
      (currentPosition) => {
        setSelectedPlace(null)
        setPosition({
          lat: Number(currentPosition.coords.latitude.toFixed(6)),
          lng: Number(currentPosition.coords.longitude.toFixed(6)),
        })
        setFilters((current) => ({
          ...current,
          sort: "distance",
        }))
        setPositionLoading(false)
      },
      () => {
        setPositionError("Posizione non disponibile.")
        setPositionLoading(false)
      },
      {
        enableHighAccuracy: false,
        maximumAge: 5 * 60 * 1000,
        timeout: 8000,
      }
    )
  }

  const filterControls = (
    <div className="grid gap-4 text-left">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-12">
        <label className="grid gap-1.5 xl:col-span-3">
          <span className={filterLabelClassName}>Razza</span>
          <select
            className={controlClassName}
            value={filters.breedId}
            disabled={breeds.length === 0}
            onChange={(event) => updateFilter("breedId", event.target.value)}
          >
            <option value="">
              {breeds.length > 0 ? "Tutte le razze" : "Razze non disponibili"}
            </option>
            {filters.breedId && !selectedBreedIsKnown ? (
              <option value={filters.breedId}>Razza selezionata</option>
            ) : null}
            {breeds.map((breed) => (
              <option key={breed.id} value={breed.id}>
                {breed.name}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-1.5 xl:col-span-3">
          <span className={filterLabelClassName}>Sesso</span>
          <select
            className={controlClassName}
            value={filters.sex}
            onChange={(event) => updateFilter("sex", event.target.value)}
          >
            {sexOptions.map((option) => (
              <option key={option.value || "any-sex"} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-1.5 xl:col-span-3">
          <span className={filterLabelClassName}>Ordina</span>
          <select
            className={controlClassName}
            value={effectiveSort}
            onChange={(event) =>
              updateFilter(
                "sort",
                event.target.value as ListingPublicListQuery["sort"]
              )
            }
          >
            {sortOptions.map((option) => (
              <option
                key={option.value}
                value={option.value}
                disabled={option.value === "distance" && !position}
              >
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <div className="grid gap-3 rounded-lg border border-brand-teal/14 bg-card/72 p-3 xl:col-span-6">
          <div className="flex items-start justify-between gap-3">
            <span className={filterLabelClassName}>Eta</span>
            <span className="text-right text-xs font-semibold text-brand-teal-ink">
              {formatAgeRange(filters)}
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1">
              <span className="text-xs text-muted-foreground">Da</span>
              <input
                type="range"
                min={0}
                max={maxCatAgeMonths}
                step={6}
                value={filters.ageMonthsMin || "0"}
                onChange={(event) =>
                  updateRangeFilter(
                    "ageMonthsMin",
                    "ageMonthsMax",
                    "min",
                    event.target.value,
                    maxCatAgeMonths
                  )
                }
                className={rangeControlClassName}
              />
            </label>

            <label className="grid gap-1">
              <span className="text-xs text-muted-foreground">Fino a</span>
              <input
                type="range"
                min={0}
                max={maxCatAgeMonths}
                step={6}
                value={filters.ageMonthsMax || String(maxCatAgeMonths)}
                onChange={(event) =>
                  updateRangeFilter(
                    "ageMonthsMin",
                    "ageMonthsMax",
                    "max",
                    event.target.value,
                    maxCatAgeMonths
                  )
                }
                className={rangeControlClassName}
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <label className="grid gap-1">
              <span className="text-xs text-muted-foreground">Da anni</span>
              <input
                type="number"
                min={0}
                max={30}
                step={0.5}
                value={monthsToYearsInput(filters.ageMonthsMin)}
                onChange={(event) =>
                  updateRangeFilter(
                    "ageMonthsMin",
                    "ageMonthsMax",
                    "min",
                    yearsToMonthsValue(event.target.value),
                    maxCatAgeMonths
                  )
                }
                className={numberControlClassName}
                placeholder="0"
              />
            </label>

            <label className="grid gap-1">
              <span className="text-xs text-muted-foreground">Fino anni</span>
              <input
                type="number"
                min={0}
                max={30}
                step={0.5}
                value={monthsToYearsInput(filters.ageMonthsMax)}
                onChange={(event) =>
                  updateRangeFilter(
                    "ageMonthsMin",
                    "ageMonthsMax",
                    "max",
                    yearsToMonthsValue(event.target.value),
                    maxCatAgeMonths
                  )
                }
                className={numberControlClassName}
                placeholder="30"
              />
            </label>
          </div>
        </div>

        <div className="grid gap-3 rounded-lg border border-brand-amber/18 bg-card/72 p-3 xl:col-span-6">
          <div className="flex items-start justify-between gap-3">
            <span className={filterLabelClassName}>Contributo</span>
            <span className="text-right text-xs font-semibold text-brand-teal-ink">
              {formatPriceRange(filters)}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {(["all", "free", "range"] as const).map((mode) => (
              <label
                key={mode}
                className={cn(
                  "flex min-h-10 cursor-pointer items-center justify-center rounded-md border px-2 text-center text-xs font-semibold transition-[border-color,background-color,color,box-shadow] focus-within:border-ring focus-within:shadow-[0_0_0_3px_color-mix(in_oklab,var(--color-ring)_20%,transparent)]",
                  filters.priceMode === mode
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card/84 text-muted-foreground hover:border-primary/30 hover:bg-brand-teal-soft hover:text-brand-teal-ink"
                )}
              >
                <input
                  type="radio"
                  value={mode}
                  checked={filters.priceMode === mode}
                  onChange={() => handlePriceModeChange(mode)}
                  className="sr-only"
                />
                {mode === "all"
                  ? "Qualsiasi"
                  : mode === "free"
                    ? "Gratis"
                    : "Fascia"}
              </label>
            ))}
          </div>

          {filters.priceMode === "range" ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1">
                  <span className="text-xs text-muted-foreground">Da euro</span>
                  <input
                    type="range"
                    min={0}
                    max={maxContributionEuros}
                    step={10}
                    value={filters.contributionEurosMin || "0"}
                    onChange={(event) =>
                      updateRangeFilter(
                        "contributionEurosMin",
                        "contributionEurosMax",
                        "min",
                        event.target.value,
                        maxContributionEuros
                      )
                    }
                    className={rangeControlClassName}
                  />
                </label>

                <label className="grid gap-1">
                  <span className="text-xs text-muted-foreground">
                    Fino euro
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={maxContributionEuros}
                    step={10}
                    value={
                      filters.contributionEurosMax ||
                      String(maxContributionEuros)
                    }
                    onChange={(event) =>
                      updateRangeFilter(
                        "contributionEurosMin",
                        "contributionEurosMax",
                        "max",
                        event.target.value,
                        maxContributionEuros
                      )
                    }
                    className={rangeControlClassName}
                  />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <label className="grid gap-1">
                  <span className="text-xs text-muted-foreground">Da</span>
                  <input
                    type="number"
                    min={0}
                    max={maxContributionEuros}
                    step={10}
                    value={filters.contributionEurosMin}
                    onChange={(event) =>
                      updateRangeFilter(
                        "contributionEurosMin",
                        "contributionEurosMax",
                        "min",
                        event.target.value,
                        maxContributionEuros
                      )
                    }
                    className={numberControlClassName}
                    placeholder="0"
                  />
                </label>

                <label className="grid gap-1">
                  <span className="text-xs text-muted-foreground">Fino</span>
                  <input
                    type="number"
                    min={0}
                    max={maxContributionEuros}
                    step={10}
                    value={filters.contributionEurosMax}
                    onChange={(event) =>
                      updateRangeFilter(
                        "contributionEurosMin",
                        "contributionEurosMax",
                        "max",
                        event.target.value,
                        maxContributionEuros
                      )
                    }
                    className={numberControlClassName}
                    placeholder="200"
                  />
                </label>
              </div>
            </>
          ) : null}
        </div>

        <div className="grid gap-1.5 xl:col-span-6">
          <span className={filterLabelClassName}>Distanza</span>
          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
            <select
              className={controlClassName}
              value={filters.radiusKm}
              disabled={!position}
              onChange={(event) => updateFilter("radiusKm", event.target.value)}
            >
              {radiusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={useCurrentPosition}
              disabled={positionLoading}
              className="h-11 rounded-md px-3"
            >
              <LocateFixedIcon aria-hidden="true" data-icon="inline-start" />
              {positionLoading ? "Rilevo..." : "Usa posizione"}
            </Button>
          </div>
        </div>
      </div>

      {position || positionError ? (
        <div>
          {position ? (
            <button
              type="button"
              onClick={() => setPosition(null)}
              className="w-fit text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Rimuovi posizione
            </button>
          ) : null}

          {positionError ? (
            <p className="text-xs text-destructive">{positionError}</p>
          ) : null}
        </div>
      ) : null}

      <fieldset className="rounded-lg border border-brand-olive/20 bg-brand-olive-soft/64 px-3 pt-2 pb-3">
        <legend className={cn(filterLabelClassName, "px-1")}>
          Cure e caratteristiche
        </legend>
        <div className="flex flex-wrap gap-2">
          {booleanFilterOptions.map((option) => (
            <label
              key={option.key}
              className={cn(
                "flex min-h-9 cursor-pointer items-center rounded-full border px-3 py-1.5 text-sm font-semibold transition-[border-color,background-color,color,box-shadow] focus-within:border-ring focus-within:shadow-[0_0_0_3px_color-mix(in_oklab,var(--color-ring)_20%,transparent)]",
                filters[option.key]
                  ? "border-primary bg-primary text-primary-foreground shadow-[0_10px_24px_-18px_color-mix(in_oklab,var(--color-primary)_72%,transparent)]"
                  : "border-border bg-card/82 text-muted-foreground hover:border-primary/30 hover:bg-brand-teal-soft hover:text-brand-teal-ink"
              )}
            >
              <input
                type="checkbox"
                checked={filters[option.key]}
                onChange={(event) =>
                  updateFilter(option.key, event.target.checked)
                }
                className="sr-only"
              />
              <span className="min-w-0 flex-1">{option.label}</span>
            </label>
          ))}
        </div>
      </fieldset>
    </div>
  )

  return (
    <form action={routes.listings()} className="w-full">
      {hiddenInputs.map(([name, value]) => (
        <input
          key={`${name}-${value}`}
          type="hidden"
          name={name}
          value={value}
        />
      ))}

      <div className="relative overflow-hidden rounded-lg border border-brand-teal/20 bg-[linear-gradient(135deg,color-mix(in_oklab,var(--color-brand-teal-soft)_82%,var(--color-brand-cream))_0%,color-mix(in_oklab,var(--color-brand-coral-soft)_58%,var(--color-brand-cream))_54%,color-mix(in_oklab,var(--color-brand-amber-soft)_78%,var(--color-brand-cream))_100%)] p-2.5 shadow-[0_30px_88px_-56px_color-mix(in_oklab,var(--color-brand-teal-ink)_62%,transparent)] backdrop-blur-2xl">
        <div className="relative">
          <div className="grid gap-2 lg:grid-cols-[minmax(0,1.08fr)_minmax(16rem,0.92fr)_auto]">
            <label className="flex h-14 items-center gap-3 rounded-lg border border-brand-teal/22 bg-card/88 px-3 shadow-xs transition-[border-color,box-shadow,background-color] focus-within:border-ring focus-within:bg-card focus-within:shadow-[0_0_0_3px_color-mix(in_oklab,var(--color-ring)_22%,transparent)]">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-teal-soft text-brand-teal-strong">
                <SearchIcon className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <input
                  name="q"
                  aria-label="Cerca annunci"
                  defaultValue={defaultValues.q ?? ""}
                  minLength={2}
                  maxLength={120}
                  placeholder="Nome, carattere o parola chiave"
                  autoComplete="off"
                  className="w-full bg-transparent text-sm font-medium text-foreground outline-none placeholder:text-muted-foreground/72"
                />
              </span>
            </label>

            <PlaceAutocompleteInput
              selectedPlace={selectedPlace}
              onSelect={handlePlaceSelect}
            />

            <div className="grid grid-cols-2 gap-2 lg:grid-cols-[auto_auto]">
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={() => setFiltersOpen((current) => !current)}
                className="h-14 rounded-lg border-brand-amber/30 bg-brand-amber-soft/72 px-4 text-brand-teal-ink hover:bg-brand-amber-soft hover:text-brand-teal-ink"
                aria-expanded={filtersOpen}
              >
                <SlidersHorizontalIcon
                  aria-hidden="true"
                  data-icon="inline-start"
                />
                Filtri
                {activeFilterCount > 0 ? (
                  <span className="ml-1 rounded-full bg-brand-coral-strong px-1.5 py-0.5 text-[0.68rem] leading-none text-brand-cream">
                    {activeFilterCount}
                  </span>
                ) : null}
              </Button>

              <Button
                type="submit"
                size="lg"
                className="h-14 rounded-lg px-5 shadow-[0_18px_34px_-26px_color-mix(in_oklab,var(--color-primary)_82%,transparent)]"
              >
                <SearchIcon aria-hidden="true" data-icon="inline-start" />
                Cerca
              </Button>
            </div>
          </div>

          {position ? (
            <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg border border-brand-teal/16 bg-brand-teal-soft px-3 py-2 text-xs text-brand-teal-ink">
              <LocateFixedIcon
                aria-hidden="true"
                className="size-3.5 text-primary"
              />
              <span>La tua posizione, entro {filters.radiusKm} km</span>
            </div>
          ) : null}

          <div
            className={cn(
              "hidden overflow-hidden transition-[grid-template-rows,opacity] duration-300 lg:grid",
              filtersOpen
                ? "grid-rows-[1fr] opacity-100"
                : "grid-rows-[0fr] opacity-0"
            )}
          >
            <div className="overflow-hidden">
              <div className="mt-3 rounded-lg border border-brand-amber/20 bg-card/64 p-3">
                {filterControls}
              </div>
            </div>
          </div>
        </div>
      </div>

      {filtersOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="listing-filters-title"
          className="fixed inset-0 z-[80] flex min-h-svh flex-col bg-background lg:hidden"
        >
          <div className="flex shrink-0 items-center justify-between gap-3 border-b bg-card/96 px-4 py-3">
            <h2 id="listing-filters-title" className="font-semibold">
              Filtri
            </h2>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setFiltersOpen(false)}
              aria-label="Chiudi filtri"
            >
              <XIcon aria-hidden="true" />
            </Button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 pb-6">
            {filterControls}
          </div>

          <div className="shrink-0 border-t bg-card/96 p-4">
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setFiltersOpen(false)}
              >
                Chiudi
              </Button>
              <Button type="submit">
                <SearchIcon aria-hidden="true" data-icon="inline-start" />
                Vedi risultati
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </form>
  )
}

export { ListingSearchForm }
