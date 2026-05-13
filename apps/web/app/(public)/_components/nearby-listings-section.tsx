"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import {
  ImageIcon,
  LocateFixedIcon,
  MapPinIcon,
  RefreshCcwIcon,
} from "lucide-react"

import { StorageImage } from "@/components/shared/storage-image"
import { getPublicObjectUrl } from "@/lib/api/assets"
import type {
  PublicListingListResponse,
  PublicListingSummary,
} from "@/lib/api/types"
import { routes } from "@/lib/routes"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"

type NearbyStatus =
  | "checking"
  | "idle"
  | "locating"
  | "loading"
  | "ready"
  | "denied"
  | "error"

type Coordinates = {
  lat: number
  lng: number
}

const nearbyListingsLimit = 6
const nearbyRadiusKm = 100

function buildNearbyHref(coordinates: Coordinates | null) {
  if (!coordinates) {
    return routes.listings()
  }

  return routes.listings({
    lat: coordinates.lat,
    lng: coordinates.lng,
    placeLabel: "La tua posizione",
    placeType: "position",
    radiusKm: nearbyRadiusKm,
    sort: "distance",
  })
}

function NearbyListingCard({ listing }: { listing: PublicListingSummary }) {
  const coverUrl = getPublicObjectUrl(
    listing.images.cover?.objectKeyLarge ?? listing.images.cover?.objectKeyThumb
  )
  const locationLabel = listing.location
    ? `${listing.location.municipality.name}, ${listing.location.province.name}`
    : "Italia"

  return (
    <Link
      href={routes.listing(listing.id)}
      className="group overflow-hidden rounded-lg border bg-card text-card-foreground shadow-sm transition-[border-color,box-shadow,transform] hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-md"
    >
      <div className="relative aspect-[4/3] bg-muted">
        {coverUrl ? (
          <StorageImage
            src={coverUrl}
            alt={listing.title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            sizes="(min-width: 1024px) 20rem, (min-width: 640px) 50vw, 100vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <ImageIcon aria-hidden="true" className="size-6" />
          </div>
        )}
      </div>
      <div className="grid gap-2 p-3.5">
        <h3 className="line-clamp-1 text-sm font-semibold">{listing.title}</h3>
        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          <MapPinIcon
            aria-hidden="true"
            className="size-3.5 shrink-0 text-brand-coral-strong"
          />
          <span className="truncate">{locationLabel}</span>
        </p>
      </div>
    </Link>
  )
}

function NearbyState({
  action,
  children,
}: {
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="rounded-lg border bg-card/88 px-4 py-5 text-card-foreground shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">{children}</p>
        {action}
      </div>
    </div>
  )
}

function NearbyListingsSection() {
  const mountedRef = useRef(true)
  const [status, setStatus] = useState<NearbyStatus>("checking")
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null)
  const [listings, setListings] = useState<PublicListingSummary[]>([])

  useEffect(() => {
    return () => {
      mountedRef.current = false
    }
  }, [])

  const fetchNearbyListings = useCallback(
    async (nextCoordinates: Coordinates) => {
      setStatus("loading")

      try {
        const params = new URLSearchParams({
          lat: String(nextCoordinates.lat),
          lng: String(nextCoordinates.lng),
          page: "1",
          pageSize: String(nearbyListingsLimit),
          radiusKm: String(nearbyRadiusKm),
          sort: "distance",
        })
        const response = await fetch(`/api/listings?${params.toString()}`, {
          cache: "no-store",
        })

        if (!response.ok) {
          throw new Error("Nearby listings request failed.")
        }

        const payload = (await response.json()) as PublicListingListResponse

        if (!mountedRef.current) {
          return
        }

        setListings(payload.items)
        setStatus("ready")
      } catch {
        if (mountedRef.current) {
          setListings([])
          setStatus("error")
        }
      }
    },
    []
  )

  const requestPosition = useCallback(() => {
    if (!navigator.geolocation) {
      setStatus("error")
      return
    }

    setStatus("locating")

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextCoordinates = {
          lat: Number(position.coords.latitude.toFixed(6)),
          lng: Number(position.coords.longitude.toFixed(6)),
        }

        setCoordinates(nextCoordinates)
        void fetchNearbyListings(nextCoordinates)
      },
      (error) => {
        setStatus(error.code === error.PERMISSION_DENIED ? "denied" : "error")
      },
      {
        enableHighAccuracy: false,
        maximumAge: 5 * 60 * 1000,
        timeout: 8000,
      }
    )
  }, [fetchNearbyListings])

  useEffect(() => {
    if (!navigator.geolocation) {
      setStatus("error")
      return
    }

    if (!navigator.permissions?.query) {
      setStatus("idle")
      return
    }

    let cancelled = false

    void navigator.permissions
      .query({ name: "geolocation" })
      .then((permissionStatus) => {
        if (cancelled || !mountedRef.current) {
          return
        }

        if (permissionStatus.state === "granted") {
          requestPosition()
          return
        }

        setStatus(permissionStatus.state === "denied" ? "denied" : "idle")
      })
      .catch(() => {
        if (!cancelled && mountedRef.current) {
          setStatus("idle")
        }
      })

    return () => {
      cancelled = true
    }
  }, [requestPosition])

  const allNearbyHref = buildNearbyHref(coordinates)
  const isBusy =
    status === "checking" || status === "locating" || status === "loading"

  return (
    <section
      id="annunci-vicino-a-te"
      className="border-t border-brand-teal/10 bg-[linear-gradient(180deg,var(--color-brand-cream)_0%,color-mix(in_oklab,var(--color-brand-teal-soft)_64%,var(--color-brand-cream))_100%)]"
    >
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div className="flex flex-col gap-2">
            <Badge
              variant="secondary"
              className="w-fit border border-brand-olive/25 bg-brand-olive-soft text-brand-teal-ink"
            >
              Esplora
            </Badge>
            <h2 className="font-heading text-2xl font-semibold tracking-normal">
              Annunci vicino a te
            </h2>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={requestPosition}
              disabled={isBusy}
            >
              {status === "ready" ? (
                <RefreshCcwIcon aria-hidden="true" data-icon="inline-start" />
              ) : (
                <LocateFixedIcon aria-hidden="true" data-icon="inline-start" />
              )}
              {isBusy
                ? "Carico"
                : status === "ready"
                  ? "Aggiorna"
                  : "Usa posizione"}
            </Button>
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="text-brand-coral-strong hover:bg-brand-coral-soft hover:text-brand-coral-strong"
            >
              <Link href={allNearbyHref}>Vedi tutti</Link>
            </Button>
          </div>
        </div>

        {status === "ready" && listings.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {listings.map((listing) => (
              <NearbyListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        ) : null}

        {status === "ready" && listings.length === 0 ? (
          <NearbyState action={null}>
            Nessun annuncio vicino alla tua zona.
          </NearbyState>
        ) : null}

        {status === "idle" ? (
          <NearbyState>
            Attiva la posizione per mostrare qui gli annunci piu vicini.
          </NearbyState>
        ) : null}

        {isBusy ? (
          <NearbyState>Sto preparando gli annunci vicini.</NearbyState>
        ) : null}

        {status === "denied" ? (
          <NearbyState>Posizione non disponibile nel browser.</NearbyState>
        ) : null}

        {status === "error" ? (
          <NearbyState>Non riesco a caricare gli annunci vicini.</NearbyState>
        ) : null}
      </div>
    </section>
  )
}

export { NearbyListingsSection }
