"use client"

import { useEffect, useId, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { Loader2Icon, MapPinIcon, XIcon } from "lucide-react"

import { formatPlaceType } from "@/app/(public)/_components/listing-search-options"
import type { PlaceAutocompleteItem } from "@/lib/api/places"
import { cn } from "@workspace/ui/lib/utils"

type PlaceAutocompleteInputProps = {
  selectedPlace: PlaceAutocompleteItem | null
  onSelect: (place: PlaceAutocompleteItem | null) => void
  type?: PlaceAutocompleteItem["type"] | "all"
  placeholder?: string
  ariaLabel?: string
}

type PlaceAutocompletePayload = {
  items: PlaceAutocompleteItem[]
}

type AutocompleteStatus = "idle" | "loading" | "ready" | "error"
type ListboxPosition = {
  left: number
  maxHeight: number
  top: number
  width: number
}

function formatSelectedPlace(place: PlaceAutocompleteItem) {
  return `${place.label}, ${formatPlaceType(place.type)}`
}

function PlaceAutocompleteInput({
  ariaLabel = "Luogo",
  onSelect,
  placeholder = "Citta, provincia o regione",
  selectedPlace,
  type = "all",
}: PlaceAutocompleteInputProps) {
  const inputId = useId()
  const listboxId = useId()
  const statusId = useId()
  const rootRef = useRef<HTMLDivElement | null>(null)
  const listboxRef = useRef<HTMLDivElement | null>(null)
  const [query, setQuery] = useState(
    selectedPlace ? formatSelectedPlace(selectedPlace) : ""
  )
  const [suggestions, setSuggestions] = useState<PlaceAutocompleteItem[]>([])
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState<AutocompleteStatus>("idle")
  const [activeIndex, setActiveIndex] = useState(-1)
  const [listboxPosition, setListboxPosition] =
    useState<ListboxPosition | null>(null)
  const loading = status === "loading"
  const showListbox = open && query.trim().length >= 2 && !selectedPlace

  useEffect(() => {
    setQuery(selectedPlace ? formatSelectedPlace(selectedPlace) : "")
  }, [selectedPlace])

  useEffect(() => {
    if (!open) {
      return
    }

    function handlePointerDown(event: MouseEvent) {
      const target = event.target

      if (
        target instanceof Node &&
        (rootRef.current?.contains(target) ||
          listboxRef.current?.contains(target))
      ) {
        return
      }

      setOpen(false)
      setActiveIndex(-1)
    }

    document.addEventListener("mousedown", handlePointerDown)

    return () => {
      document.removeEventListener("mousedown", handlePointerDown)
    }
  }, [open])

  useEffect(() => {
    if (!showListbox) {
      setListboxPosition(null)
      return
    }

    function updateListboxPosition() {
      const rect = rootRef.current?.getBoundingClientRect()

      if (!rect) {
        setListboxPosition(null)
        return
      }

      setListboxPosition({
        left: rect.left,
        maxHeight: Math.max(160, window.innerHeight - rect.bottom - 16),
        top: rect.bottom + 8,
        width: rect.width,
      })
    }

    updateListboxPosition()
    window.addEventListener("resize", updateListboxPosition)
    window.addEventListener("scroll", updateListboxPosition, true)

    return () => {
      window.removeEventListener("resize", updateListboxPosition)
      window.removeEventListener("scroll", updateListboxPosition, true)
    }
  }, [showListbox])

  useEffect(() => {
    const normalizedQuery = query.trim()

    if (!open || selectedPlace || normalizedQuery.length < 2) {
      setSuggestions([])
      setStatus("idle")
      setActiveIndex(-1)
      return
    }

    const controller = new AbortController()
    setSuggestions([])
    setStatus("loading")
    setActiveIndex(-1)

    const timeoutId = window.setTimeout(async () => {
      try {
        const params = new URLSearchParams({
          q: normalizedQuery,
          limit: "8",
        })

        if (type !== "all") {
          params.set("type", type)
        }

        const response = await fetch(
          `/api/places/autocomplete?${params.toString()}`,
          {
            cache: "no-store",
            signal: controller.signal,
          }
        )

        if (!response.ok) {
          throw new Error("Autocomplete request failed.")
        }

        const payload = (await response.json()) as PlaceAutocompletePayload
        setSuggestions(payload.items)
        setActiveIndex(payload.items.length > 0 ? 0 : -1)
        setStatus("ready")
      } catch {
        if (!controller.signal.aborted) {
          setSuggestions([])
          setActiveIndex(-1)
          setStatus("error")
        }
      }
    }, 220)

    return () => {
      controller.abort()
      window.clearTimeout(timeoutId)
    }
  }, [open, query, selectedPlace, type])

  function handleSelect(place: PlaceAutocompleteItem) {
    onSelect(place)
    setQuery(formatSelectedPlace(place))
    setSuggestions([])
    setOpen(false)
    setActiveIndex(-1)
    setStatus("idle")
  }

  function clearSelection() {
    onSelect(null)
    setQuery("")
    setSuggestions([])
    setOpen(false)
    setActiveIndex(-1)
    setStatus("idle")
  }

  return (
    <div className="relative min-w-0" ref={rootRef}>
      <label
        className={cn(
          "flex h-14 items-center gap-3 rounded-lg border border-brand-coral/20 bg-card/88 px-3 shadow-xs transition-[border-color,box-shadow,background-color]",
          "focus-within:border-ring focus-within:bg-card focus-within:shadow-[0_0_0_3px_color-mix(in_oklab,var(--color-ring)_22%,transparent)]",
          loading && "border-brand-teal/40 bg-card"
        )}
        htmlFor={inputId}
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-coral-soft text-brand-coral-strong">
          <MapPinIcon className="size-4" />
        </span>
        <span className="min-w-0 flex-1">
          <input
            id={inputId}
            type="text"
            value={query}
            aria-label={ariaLabel}
            placeholder={placeholder}
            autoComplete="off"
            role="combobox"
            aria-autocomplete="list"
            aria-controls={listboxId}
            aria-describedby={loading ? statusId : undefined}
            aria-expanded={open}
            aria-busy={loading}
            onChange={(event) => {
              if (selectedPlace) {
                onSelect(null)
              }

              setQuery(event.target.value)
              setOpen(true)
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={(event) => {
              if (!open || suggestions.length === 0) {
                return
              }

              if (event.key === "ArrowDown") {
                event.preventDefault()
                setActiveIndex((current) =>
                  current >= suggestions.length - 1 ? 0 : current + 1
                )
              }

              if (event.key === "ArrowUp") {
                event.preventDefault()
                setActiveIndex((current) =>
                  current <= 0 ? suggestions.length - 1 : current - 1
                )
              }

              if (event.key === "Enter" && activeIndex >= 0) {
                event.preventDefault()
                const activeSuggestion = suggestions[activeIndex]

                if (activeSuggestion) {
                  handleSelect(activeSuggestion)
                }
              }

              if (event.key === "Escape") {
                setOpen(false)
                setActiveIndex(-1)
              }
            }}
            className="w-full bg-transparent text-sm font-medium text-foreground outline-none placeholder:text-muted-foreground/72"
          />
        </span>

        {loading && !selectedPlace ? (
          <span
            id={statusId}
            className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground"
            aria-live="polite"
          >
            <Loader2Icon aria-hidden="true" className="size-4 animate-spin" />
            <span className="sr-only">Caricamento luoghi</span>
            <span aria-hidden="true" className="hidden sm:inline">
              Carico
            </span>
          </span>
        ) : null}

        {selectedPlace ? (
          <button
            type="button"
            aria-label="Rimuovi luogo"
            onClick={clearSelection}
            className="flex size-7 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <XIcon aria-hidden="true" className="size-3.5" />
          </button>
        ) : null}
      </label>

      {showListbox && listboxPosition
        ? createPortal(
            <div
              id={listboxId}
              ref={listboxRef}
              role="listbox"
              style={{
                left: listboxPosition.left,
                maxHeight: listboxPosition.maxHeight,
                top: listboxPosition.top,
                width: listboxPosition.width,
              }}
              className="fixed z-50 overflow-y-auto rounded-lg border border-border bg-popover p-1.5 text-popover-foreground shadow-[0_24px_70px_-46px_color-mix(in_oklab,var(--color-brand-teal-ink)_56%,transparent)]"
            >
              {loading ? (
                <div
                  className="flex items-center gap-2 px-3 py-2.5 text-sm text-muted-foreground"
                  aria-live="polite"
                >
                  <Loader2Icon
                    aria-hidden="true"
                    className="size-4 animate-spin"
                  />
                  Caricamento luoghi...
                </div>
              ) : null}

              {status === "error" ? (
                <p className="px-3 py-2.5 text-sm text-destructive">
                  Non riesco a caricare i luoghi. Riprova.
                </p>
              ) : null}

              {status === "ready" && suggestions.length === 0 ? (
                <p className="px-3 py-2.5 text-sm text-muted-foreground">
                  Nessun luogo trovato
                </p>
              ) : null}

              {suggestions.map((suggestion, index) => (
                <button
                  key={`${suggestion.type}-${suggestion.id}`}
                  type="button"
                  role="option"
                  aria-selected={index === activeIndex}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => handleSelect(suggestion)}
                  className={cn(
                    "flex w-full items-start justify-between gap-3 rounded-md px-3 py-2.5 text-left transition-colors",
                    index === activeIndex
                      ? "bg-muted text-foreground"
                      : "hover:bg-muted/70"
                  )}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">
                      {suggestion.label}
                      <span className="font-medium text-muted-foreground">
                        {`, ${formatPlaceType(suggestion.type)}`}
                      </span>
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                      {suggestion.subtitle}
                    </span>
                  </span>
                </button>
              ))}
            </div>,
            document.body
          )
        : null}
    </div>
  )
}

export { PlaceAutocompleteInput }
