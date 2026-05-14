"use client"

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { BellIcon, XIcon } from "lucide-react"

import { routes } from "@/lib/routes"
import { Button } from "@workspace/ui/components/button"

type NotificationType =
  | "listing_moderation_decision"
  | "listing_review_submission"
  | "listing_contact_request"
  | "listing_report_decision"

type Notification = {
  id: string
  type: NotificationType
  payload: Record<string, unknown>
  readAt: string | null
  createdAt: string
}

type SnapshotEvent = {
  unreadCount: number
}

type CreatedEvent = SnapshotEvent & {
  notification: Notification
}

type ReadEvent = SnapshotEvent & {
  notification: Notification
  notificationId: string
}

type ReadAllEvent = SnapshotEvent & {
  updatedCount: number
}

type DeletedEvent = SnapshotEvent & {
  notificationId: string
}

type RealtimeNotificationsContextValue = {
  connected: boolean
  enabled: boolean
  unreadCount: number | null
}

const RealtimeNotificationsContext =
  createContext<RealtimeNotificationsContextValue>({
    connected: false,
    enabled: false,
    unreadCount: null,
  })

type RealtimeNotificationsProviderProps = {
  children: ReactNode
  enabled: boolean
}

function RealtimeNotificationsProvider({
  children,
  enabled,
}: RealtimeNotificationsProviderProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [connected, setConnected] = useState(false)
  const [unreadCount, setUnreadCount] = useState<number | null>(null)
  const [latestNotification, setLatestNotification] =
    useState<Notification | null>(null)

  useEffect(() => {
    if (!enabled) {
      return
    }

    const source = new EventSource("/api/notifications/stream")

    source.onopen = () => {
      setConnected(true)
    }
    source.onerror = () => {
      setConnected(false)
    }

    source.addEventListener("snapshot", (event) => {
      const data = parseRealtimeEvent<SnapshotEvent>(event)

      if (data) {
        setUnreadCount(data.unreadCount)
      }
    })

    source.addEventListener("created", (event) => {
      const data = parseRealtimeEvent<CreatedEvent>(event)

      if (!data) {
        return
      }

      setUnreadCount(data.unreadCount)
      setLatestNotification(data.notification)
      refreshAccountViews(pathname, router)
    })

    source.addEventListener("read", (event) => {
      const data = parseRealtimeEvent<ReadEvent>(event)

      if (data) {
        setUnreadCount(data.unreadCount)
        refreshAccountViews(pathname, router)
      }
    })

    source.addEventListener("read_all", (event) => {
      const data = parseRealtimeEvent<ReadAllEvent>(event)

      if (data) {
        setUnreadCount(data.unreadCount)
        refreshAccountViews(pathname, router)
      }
    })

    source.addEventListener("deleted", (event) => {
      const data = parseRealtimeEvent<DeletedEvent>(event)

      if (data) {
        setUnreadCount(data.unreadCount)
        refreshAccountViews(pathname, router)
      }
    })

    return () => {
      source.close()
      setConnected(false)
    }
  }, [enabled, pathname, router])

  useEffect(() => {
    if (!latestNotification) {
      return
    }

    const timer = window.setTimeout(() => {
      setLatestNotification(null)
    }, 8_000)

    return () => {
      window.clearTimeout(timer)
    }
  }, [latestNotification])

  const value = useMemo(
    () => ({
      connected,
      enabled,
      unreadCount,
    }),
    [connected, enabled, unreadCount]
  )

  return (
    <RealtimeNotificationsContext.Provider value={value}>
      {children}
      <RealtimeNotificationNotice
        notification={latestNotification}
        onDismiss={() => {
          setLatestNotification(null)
        }}
      />
    </RealtimeNotificationsContext.Provider>
  )
}

function useRealtimeNotifications() {
  return useContext(RealtimeNotificationsContext)
}

function RealtimeNotificationNotice({
  notification,
  onDismiss,
}: {
  notification: Notification | null
  onDismiss: () => void
}) {
  if (!notification) {
    return null
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed right-4 bottom-4 z-[70] w-[min(24rem,calc(100vw-2rem))] rounded-lg border bg-background p-4 text-foreground shadow-xl"
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <BellIcon aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Nuova notifica</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatNotificationMessage(notification)}
          </p>
          <Button asChild size="sm" className="mt-3">
            <Link href={routes.accountNotifications}>Apri notifiche</Link>
          </Button>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Chiudi notifica"
          onClick={onDismiss}
        >
          <XIcon data-icon="icon" aria-hidden="true" />
        </Button>
      </div>
    </div>
  )
}

function parseRealtimeEvent<T>(event: Event): T | null {
  if (!(event instanceof MessageEvent)) {
    return null
  }

  try {
    return JSON.parse(event.data) as T
  } catch {
    return null
  }
}

function refreshAccountViews(
  pathname: string | null,
  router: ReturnType<typeof useRouter>
) {
  if (pathname?.startsWith("/account")) {
    router.refresh()
  }
}

function formatNotificationMessage(notification: Notification) {
  if (notification.type === "listing_moderation_decision") {
    return formatModerationDecision(notification.payload)
  }

  if (notification.type === "listing_report_decision") {
    return "La tua segnalazione e' stata aggiornata."
  }

  if (notification.type === "listing_review_submission") {
    return formatReviewSubmission(notification.payload)
  }

  if (notification.type === "listing_contact_request") {
    return formatContactRequest(notification.payload)
  }

  return "Ci sono aggiornamenti sul tuo account."
}

function formatReviewSubmission(payload: Record<string, unknown>) {
  const title = readString(payload.listingTitle)

  return title
    ? `Il tuo annuncio e' in revisione: ${title}`
    : "Il tuo annuncio e' in revisione."
}

function formatContactRequest(payload: Record<string, unknown>) {
  const requester = readString(payload.requesterDisplayName)
  const title = readString(payload.listingTitle)

  if (requester && title) {
    return `${requester} ha richiesto un contatto per ${title}.`
  }

  return "Hai ricevuto una nuova richiesta di contatto."
}

function formatModerationDecision(payload: Record<string, unknown>) {
  const title = readString(payload.listingTitle)
  const suffix = title ? `: ${title}` : "."

  if (payload.decision === "approved") {
    return `Il tuo annuncio e' stato pubblicato${suffix}`
  }

  if (payload.decision === "rejected") {
    return `Il tuo annuncio richiede modifiche${suffix}`
  }

  if (payload.decision === "suspended") {
    return `Il tuo annuncio e' stato sospeso${suffix}`
  }

  return `Il tuo annuncio ha un nuovo aggiornamento${suffix}`
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null
}

export { RealtimeNotificationsProvider, useRealtimeNotifications }
