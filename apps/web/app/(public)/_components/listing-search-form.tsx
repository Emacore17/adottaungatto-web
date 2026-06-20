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
import { Input } from "@workspace/ui/components/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
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

const compactFieldClassName = "grid gap-2"
const compactInputClassName =
  "h-11 rounded-xl border-border bg-background text-sm shadow-none focus-visible:border-primary focus-visible:ring-primary/25"
const filterLabelClassName =
  "text-[11px] font-semibold tracking-wide text-muted-foreground uppercase"

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
    return "Qualsiasi prezzo"
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
    <div className="@container grid gap-4 text-left">
      <div className="grid gap-3 @md:grid-cols-2 @5xl:grid-cols-12">
        <div className={cn(compactFieldClassName, "@5xl:col-span-3")}>
          <span className={filterLabelClassName}>Razza</span>
          <Select
            value={filters.breedId || "__all__"}
            disabled={breeds.length === 0}
            onValueChange={(value) =>
              updateFilter("breedId", value === "__all__" ? "" : value)
            }
          >
            <SelectTrigger aria-label="Razza">
              <SelectValue placeholder="Tutte le razze" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">
                {breeds.length > 0 ? "Tutte le razze" : "Razze non disponibili"}
              </SelectItem>
              {filters.breedId && !selectedBreedIsKnown ? (
                <SelectItem value={filters.breedId}>
                  Razza selezionata
                </SelectItem>
              ) : null}
              {breeds.map((breed) => (
                <SelectItem key={breed.id} value={breed.id}>
                  {breed.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className={cn(compactFieldClassName, "@5xl:col-span-2")}>
          <span className={filterLabelClassName}>Sesso</span>
          <Select
            value={filters.sex || "__any__"}
            onValueChange={(value) =>
              updateFilter("sex", value === "__any__" ? "" : value)
            }
          >
            <SelectTrigger aria-label="Sesso">
              <SelectValue placeholder="Qualsiasi" />
            </SelectTrigger>
            <SelectContent>
              {sexOptions.map((option) => (
                <SelectItem
                  key={option.value || "any-sex"}
                  value={option.value || "__any__"}
                >
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className={cn(compactFieldClassName, "@5xl:col-span-3")}>
          <div className="flex min-h-5 items-center justify-between gap-2">
            <span className={filterLabelClassName}>Eta</span>
            <span className="truncate text-right text-xs font-medium text-muted-foreground">
              {formatAgeRange(filters)}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <label>
              <span className="sr-only">Eta minima in anni</span>
              <Input
                type="number"
                min={0}
                max={30}
                step={0.5}
                inputMode="decimal"
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
                className={compactInputClassName}
                placeholder="Da anni"
              />
            </label>

            <label>
              <span className="sr-only">Eta massima in anni</span>
              <Input
                type="number"
                min={0}
                max={30}
                step={0.5}
                inputMode="decimal"
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
                className={compactInputClassName}
                placeholder="A anni"
              />
            </label>
          </div>
        </div>

        <div className={cn(compactFieldClassName, "@5xl:col-span-4")}>
          <div className="flex min-h-5 items-center justify-between gap-2">
            <span className={filterLabelClassName}>Prezzo</span>
            <span className="truncate text-right text-xs font-medium text-muted-foreground">
              {formatPriceRange(filters)}
            </span>
          </div>

          <div
            className={cn(
              "grid gap-2",
              filters.priceMode === "range" &&
                "@5xl:grid-cols-[minmax(7rem,0.9fr)_minmax(0,1fr)_minmax(0,1fr)]"
            )}
          >
            <Select
              value={filters.priceMode}
              onValueChange={(value) =>
                handlePriceModeChange(value as SearchFilters["priceMode"])
              }
            >
              <SelectTrigger aria-label="Modalita prezzo">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Qualsiasi</SelectItem>
                <SelectItem value="free">Gratis</SelectItem>
                <SelectItem value="range">Fascia</SelectItem>
              </SelectContent>
            </Select>

            {filters.priceMode === "range" ? (
              <>
                <label>
                  <span className="sr-only">Prezzo minimo</span>
                  <Input
                    type="number"
                    min={0}
                    max={maxContributionEuros}
                    step={10}
                    inputMode="numeric"
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
                    className={compactInputClassName}
                    placeholder="Da euro"
                  />
                </label>

                <label>
                  <span className="sr-only">Prezzo massimo</span>
                  <Input
                    type="number"
                    min={0}
                    max={maxContributionEuros}
                    step={10}
                    inputMode="numeric"
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
                    className={compactInputClassName}
                    placeholder="A euro"
                  />
                </label>
              </>
            ) : null}
          </div>
        </div>

        <div className={cn(compactFieldClassName, "@5xl:col-span-3")}>
          <span className={filterLabelClassName}>Ordina</span>
          <Select
            value={effectiveSort}
            onValueChange={(value) =>
              updateFilter("sort", value as ListingPublicListQuery["sort"])
            }
          >
            <SelectTrigger aria-label="Ordina">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {sortOptions.map((option) => (
                <SelectItem
                  key={option.value}
                  value={option.value}
                  disabled={option.value === "distance" && !position}
                >
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className={cn(compactFieldClassName, "@5xl:col-span-5")}>
          <span className={filterLabelClassName}>Distanza</span>
          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
            <Select
              value={filters.radiusKm}
              disabled={!position}
              onValueChange={(value) => updateFilter("radiusKm", value)}
            >
              <SelectTrigger aria-label="Raggio">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {radiusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={useCurrentPosition}
              disabled={positionLoading}
              className="h-9 rounded-md px-3"
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

      <fieldset className="rounded-2xl border border-border/60 bg-background/40 px-4 pt-3 pb-4">
        <legend className={cn(filterLabelClassName, "px-2")}>
          Cure e caratteristiche
        </legend>
        <div className="flex flex-wrap gap-2">
          {booleanFilterOptions.map((option) => (
            <label
              key={option.key}
              className={cn(
                "inline-flex min-h-9 cursor-pointer items-center rounded-full border px-4 py-1.5 text-xs font-medium transition-colors focus-within:ring-2 focus-within:ring-ring/30",
                filters[option.key]
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-background text-foreground hover:bg-secondary"
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

      <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-2 shadow-lg shadow-foreground/5 sm:p-2.5">
        <div className="relative">
          <div className="grid gap-2 lg:grid-cols-[minmax(0,1.15fr)_minmax(16rem,0.9fr)_auto]">
            <label className="flex h-12 items-center gap-3 rounded-xl border border-border bg-background px-4 transition-colors duration-200 focus-within:border-foreground">
              <SearchIcon className="size-4 shrink-0 text-muted-foreground" />
              <input
                name="q"
                aria-label="Cerca annunci"
                defaultValue={defaultValues.q ?? ""}
                minLength={2}
                maxLength={120}
                placeholder="Nome, carattere o parola chiave"
                autoComplete="off"
                className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/70"
              />
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
                className="h-12 px-4 text-sm"
                aria-expanded={filtersOpen}
              >
                <SlidersHorizontalIcon
                  aria-hidden="true"
                  data-icon="inline-start"
                />
                Filtri
                {activeFilterCount > 0 ? (
                  <span className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
                    {activeFilterCount}
                  </span>
                ) : null}
              </Button>

              <Button
                type="submit"
                variant="accent"
                size="lg"
                className="h-12 px-5 text-sm"
              >
                <SearchIcon aria-hidden="true" data-icon="inline-start" />
                Cerca
              </Button>
            </div>
          </div>

          {position ? (
            <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg border border-border bg-secondary px-3 py-2 text-xs text-foreground">
              <LocateFixedIcon
                aria-hidden="true"
                className="size-3.5 text-muted-foreground"
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
              <div className="mt-3 rounded-xl border border-border bg-secondary/40 p-4 sm:p-5">
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
