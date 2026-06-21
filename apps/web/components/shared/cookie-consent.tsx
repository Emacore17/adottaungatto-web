"use client"

import { useSyncExternalStore } from "react"
import Link from "next/link"

import { routes } from "@/lib/routes"
import { Button } from "@workspace/ui/components/button"

const consentStorageKey = "aug.cookie-consent.v1"

type ConsentChoice = "all" | "essential"

const listeners = new Set<() => void>()

function subscribe(callback: () => void) {
  listeners.add(callback)
  window.addEventListener("storage", callback)

  return () => {
    listeners.delete(callback)
    window.removeEventListener("storage", callback)
  }
}

function readStoredConsent(): ConsentChoice | null {
  try {
    const value = window.localStorage.getItem(consentStorageKey)

    return value === "all" || value === "essential" ? value : null
  } catch {
    return null
  }
}

// Sul server non conosciamo la scelta: trattiamo come "non decisa" e lasciamo
// che il client riallinei dopo l'hydration via useSyncExternalStore.
function getServerConsent(): ConsentChoice | null {
  return null
}

function storeConsent(choice: ConsentChoice) {
  try {
    window.localStorage.setItem(consentStorageKey, choice)
  } catch {
    // Storage non disponibile (modalita privata, ecc.): il banner riapparira'.
  }

  for (const listener of listeners) {
    listener()
  }
}

function CookieConsent() {
  const consent = useSyncExternalStore(
    subscribe,
    readStoredConsent,
    getServerConsent
  )

  if (consent !== null) {
    return null
  }

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label="Preferenze cookie"
      className="fixed inset-x-0 bottom-0 z-50 px-4 pb-4 sm:px-6"
    >
      <div className="mx-auto flex max-w-3xl flex-col gap-4 rounded-lg border border-border bg-background p-4 shadow-lg sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <p className="text-sm leading-6 text-muted-foreground">
          Usiamo cookie tecnici necessari al funzionamento del sito. Con il tuo
          consenso possiamo usare anche cookie non essenziali per migliorare il
          servizio. Vedi la{" "}
          <Link
            href={routes.cookie}
            className="font-medium text-foreground underline underline-offset-4"
          >
            cookie policy
          </Link>
          .
        </p>
        <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            variant="outline"
            onClick={() => storeConsent("essential")}
          >
            Solo necessari
          </Button>
          <Button type="button" onClick={() => storeConsent("all")}>
            Accetta tutti
          </Button>
        </div>
      </div>
    </div>
  )
}

export { CookieConsent }
