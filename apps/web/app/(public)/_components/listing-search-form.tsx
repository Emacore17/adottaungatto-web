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
  ageOptions,
  booleanFilterOptions,
  radiusOptions,
  sexOptions,
  sortOptions,
} from "@/app/(public)/_components/listing-search-options"
import { PlaceAutocompleteInput } from "@/app/(public)/_components/place-autocomplete-input"
import type { PlaceAutocompleteItem } from "@/lib/api/places"
import { routes } from "@/lib/routes"
import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

type ListingSearchDefaults = Partial<ListingPublicListQuery> & {
  placeLabel?: string | null
  placeType?: PlaceAutocompleteType | "position" | null
}

type ListingSearchFormProps = {
  defaultValues?: ListingSearchDefaults
}

type BooleanFilterKey = (typeof booleanFilterOptions)[number]["key"]

type Coordinates = {
  lat: number
  lng: number
}

type SearchFilters = {
  sex: string
  ageMonthsMin: string
  ageMonthsMax: string
  sort: ListingPublicListQuery["sort"]
  radiusKm: string
} & Record<BooleanFilterKey, boolean>

const controlClassName =
  "h-11 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground outline-none transition-[border-color,box-shadow,background-color] focus:border-ring focus:shadow-[0_0_0_3px_color-mix(in_oklab,var(--color-ring)_22%,transparent)]"

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
    isFree: defaultValues.isFree === true,
    isSterilized: defaultValues.isSterilized === true,
    isVaccinated: defaultValues.isVaccinated === true,
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
    (filters.sex ? 1 : 0) +
    (filters.ageMonthsMin ? 1 : 0) +
    (filters.ageMonthsMax ? 1 : 0) +
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

function ListingSearchForm({ defaultValues = {} }: ListingSearchFormProps) {
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
      const next = {
        ...current,
        [key]: value,
      }

      const min = next.ageMonthsMin ? Number(next.ageMonthsMin) : null
      const max = next.ageMonthsMax ? Number(next.ageMonthsMax) : null

      if (min !== null && max !== null && min > max) {
        if (key === "ageMonthsMin") {
          next.ageMonthsMax = ""
        } else {
          next.ageMonthsMin = ""
        }
      }

      return next
    })
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
    <div className="grid gap-4 lg:grid-cols-[0.7fr_1fr]">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
        <label className="grid gap-1.5">
          <span className="text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase">
            Sesso
          </span>
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

        <label className="grid gap-1.5">
          <span className="text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase">
            Ordina
          </span>
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

        <div className="grid gap-2 rounded-lg border border-border bg-background/70 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase">
              Distanza
            </span>
            <button
              type="button"
              onClick={useCurrentPosition}
              className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-medium text-primary transition-colors hover:bg-muted"
            >
              <LocateFixedIcon aria-hidden="true" className="size-3.5" />
              {positionLoading ? "Rilevo..." : "Usa posizione"}
            </button>
          </div>

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
      </div>

      <div className="grid gap-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1.5">
            <span className="text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase">
              Eta minima
            </span>
            <select
              className={controlClassName}
              value={filters.ageMonthsMin}
              onChange={(event) =>
                updateFilter("ageMonthsMin", event.target.value)
              }
            >
              {ageOptions.map((option) => (
                <option
                  key={`min-${option.value || "any"}`}
                  value={option.value}
                >
                  {option.value ? `Da ${option.label}` : option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-1.5">
            <span className="text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase">
              Eta massima
            </span>
            <select
              className={controlClassName}
              value={filters.ageMonthsMax}
              onChange={(event) =>
                updateFilter("ageMonthsMax", event.target.value)
              }
            >
              {ageOptions.map((option) => (
                <option
                  key={`max-${option.value || "any"}`}
                  value={option.value}
                >
                  {option.value ? `Fino a ${option.label}` : option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {booleanFilterOptions.map((option) => (
            <label
              key={option.key}
              className={cn(
                "flex min-h-11 items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors",
                filters[option.key]
                  ? "border-primary/35 bg-primary/8 text-foreground"
                  : "border-border bg-background/70 text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              )}
            >
              <input
                type="checkbox"
                checked={filters[option.key]}
                onChange={(event) =>
                  updateFilter(option.key, event.target.checked)
                }
                className="size-4 accent-primary"
              />
              {option.label}
            </label>
          ))}
        </div>
      </div>
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

      <div className="rounded-lg border border-border/80 bg-background/86 p-2 shadow-[0_26px_80px_-48px_rgba(20,14,20,0.58)] backdrop-blur-2xl">
        <div className="grid gap-2 lg:grid-cols-[minmax(0,1.12fr)_minmax(16rem,0.88fr)_auto_auto]">
          <label className="flex h-14 items-center gap-3 rounded-lg border border-border bg-background/92 px-3 transition-[border-color,box-shadow,background-color] focus-within:border-ring focus-within:bg-background focus-within:shadow-[0_0_0_3px_color-mix(in_oklab,var(--color-ring)_22%,transparent)]">
            <SearchIcon className="size-4 shrink-0 text-muted-foreground" />
            <span className="min-w-0 flex-1">
              <span className="block text-[0.68rem] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
                Cerca
              </span>
              <input
                name="q"
                defaultValue={defaultValues.q ?? ""}
                minLength={2}
                maxLength={120}
                placeholder="Nome, razza o parola chiave"
                autoComplete="off"
                className="mt-0.5 w-full bg-transparent text-sm font-medium text-foreground outline-none placeholder:text-muted-foreground/72"
              />
            </span>
          </label>

          <PlaceAutocompleteInput
            selectedPlace={selectedPlace}
            onSelect={handlePlaceSelect}
          />

          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={() => setFiltersOpen((current) => !current)}
            className="h-14 rounded-lg px-4"
            aria-expanded={filtersOpen}
          >
            <SlidersHorizontalIcon aria-hidden="true" />
            Filtri
            {activeFilterCount > 0 ? (
              <span className="ml-1 rounded-full bg-primary px-1.5 py-0.5 text-[0.68rem] leading-none text-primary-foreground">
                {activeFilterCount}
              </span>
            ) : null}
          </Button>

          <Button type="submit" size="lg" className="h-14 rounded-lg px-5">
            <SearchIcon aria-hidden="true" />
            Cerca
          </Button>
        </div>

        {position ? (
          <div className="mt-2 flex flex-wrap items-center gap-2 rounded-md bg-muted/70 px-3 py-2 text-xs text-muted-foreground">
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
            <div className="mt-3 border-t border-border/80 pt-3">
              {filterControls}
            </div>
          </div>
        </div>
      </div>

      {filtersOpen ? (
        <div className="fixed inset-0 z-[70] bg-foreground/18 lg:hidden">
          <button
            type="button"
            aria-label="Chiudi filtri"
            className="absolute inset-0 h-full w-full"
            onClick={() => setFiltersOpen(false)}
          />
          <div className="absolute right-0 bottom-0 left-0 max-h-[88svh] overflow-y-auto rounded-t-lg border border-border bg-background shadow-[0_-24px_70px_-46px_rgba(20,14,20,0.58)]">
            <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b bg-background/92 px-4 py-3 backdrop-blur-xl">
              <p className="font-semibold">Filtri</p>
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
            <div className="px-4 py-4">{filterControls}</div>
            <div className="sticky bottom-0 border-t bg-background/92 p-4 backdrop-blur-xl">
              <Button
                type="button"
                className="w-full"
                onClick={() => setFiltersOpen(false)}
              >
                Applica filtri
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </form>
  )
}

export { ListingSearchForm }
