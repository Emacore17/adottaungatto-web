"use client"

import { useCallback, useEffect, useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  BellIcon,
  CheckIcon,
  HeartIcon,
  Loader2Icon,
  LogOutIcon,
  SettingsIcon,
  ShieldCheckIcon,
  Trash2Icon,
  UserIcon,
} from "lucide-react"

import { logoutAction } from "@/components/layout/header-actions"
import { useRealtimeNotifications } from "@/components/providers/realtime-notifications-provider"
import type { AuthUser } from "@/lib/api/auth"
import type { Notification, NotificationListResponse } from "@/lib/api/account"
import { routes } from "@/lib/routes"
import { Avatar, AvatarFallback } from "@workspace/ui/components/avatar"
import { Button } from "@workspace/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import { cn } from "@workspace/ui/lib/utils"

type HeaderAccountControlsProps = {
  className?: string
  user: AuthUser
}

type NotificationStatus = "error" | "idle" | "loading" | "ready"

const notificationsPreviewSize = 5

function HeaderAccountControls({
  className,
  user,
}: HeaderAccountControlsProps) {
  return (
    <div className={cn("flex items-center justify-end gap-2.5", className)}>
      <HeaderNotificationsMenu />
      <HeaderUserMenu user={user} />
    </div>
  )
}

function HeaderNotificationsMenu() {
  const router = useRouter()
  const { unreadCount } = useRealtimeNotifications()
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState<NotificationStatus>("idle")
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [meta, setMeta] = useState<NotificationListResponse["meta"] | null>(
    null
  )
  const [mutatingId, setMutatingId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const loadNotifications = useCallback(async () => {
    setStatus("loading")

    try {
      const response = await fetch(
        `/api/notifications?page=1&pageSize=${notificationsPreviewSize}`,
        {
          cache: "no-store",
        }
      )

      if (!response.ok) {
        throw new Error("Notification preview request failed.")
      }

      const payload = (await response.json()) as NotificationListResponse

      setNotifications(payload.items)
      setMeta(payload.meta)
      setStatus("ready")
    } catch {
      setStatus("error")
    }
  }, [])

  useEffect(() => {
    if (open) {
      void loadNotifications()
    }
  }, [loadNotifications, open, unreadCount])

  async function mutateNotification(
    notificationId: string,
    action: "delete" | "read"
  ) {
    setMutatingId(notificationId)

    try {
      const response = await fetch(
        action === "read"
          ? `/api/notifications/${notificationId}/read`
          : `/api/notifications/${notificationId}`,
        {
          method: action === "read" ? "POST" : "DELETE",
        }
      )

      if (!response.ok) {
        throw new Error("Notification mutation failed.")
      }

      await loadNotifications()
      startTransition(() => {
        router.refresh()
      })
    } catch {
      setStatus("error")
    } finally {
      setMutatingId(null)
    }
  }

  async function markAllRead() {
    setMutatingId("all")

    try {
      const response = await fetch("/api/notifications/read-all", {
        method: "POST",
      })

      if (!response.ok) {
        throw new Error("Notification mutation failed.")
      }

      await loadNotifications()
      startTransition(() => {
        router.refresh()
      })
    } catch {
      setStatus("error")
    } finally {
      setMutatingId(null)
    }
  }

  const displayedUnreadCount = unreadCount ?? meta?.unreadCount ?? 0
  const hasUnread = displayedUnreadCount > 0

  return (
    <DropdownMenu modal={false} open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={
            hasUnread
              ? `${displayedUnreadCount} notifiche non lette`
              : "Apri notifiche"
          }
          className="relative rounded-full border border-border/70 bg-card/78 text-brand-teal-ink shadow-sm hover:bg-brand-teal-soft hover:text-brand-teal-strong"
        >
          <BellIcon aria-hidden="true" />
          {hasUnread ? (
            <span
              className="absolute -top-1 -right-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-coral-strong px-1.5 text-[0.65rem] leading-none font-semibold text-brand-cream ring-2 ring-brand-cream"
              data-notification-badge
              data-unread-count={displayedUnreadCount}
            >
              {displayedUnreadCount > 99 ? "99+" : displayedUnreadCount}
            </span>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={10}
        className="w-96 max-w-[calc(100vw-1rem)] p-2"
      >
        <div className="flex items-center justify-between gap-3 px-2 py-1.5">
          <div className="min-w-0">
            <p className="text-sm font-semibold">Notifiche</p>
            <p className="text-xs text-muted-foreground">
              {hasUnread
                ? `${displayedUnreadCount} non lette`
                : "Nessuna non letta"}
            </p>
          </div>
          {hasUnread ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={mutatingId === "all" || isPending}
              onClick={(event) => {
                event.preventDefault()
                void markAllRead()
              }}
            >
              {mutatingId === "all" ? (
                <Loader2Icon
                  aria-hidden="true"
                  data-icon="inline-start"
                  className="animate-spin"
                />
              ) : (
                <CheckIcon aria-hidden="true" data-icon="inline-start" />
              )}
              Tutte lette
            </Button>
          ) : null}
        </div>
        <DropdownMenuSeparator />

        {status === "loading" && notifications.length === 0 ? (
          <div className="flex items-center gap-2 px-2 py-5 text-sm text-muted-foreground">
            <Loader2Icon aria-hidden="true" className="size-4 animate-spin" />
            Carico notifiche
          </div>
        ) : null}

        {status === "error" ? (
          <div className="grid gap-2 px-2 py-4 text-sm">
            <p className="text-muted-foreground">
              Non riesco a caricare le notifiche.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={(event) => {
                event.preventDefault()
                void loadNotifications()
              }}
            >
              Riprova
            </Button>
          </div>
        ) : null}

        {status !== "error" && notifications.length > 0 ? (
          <div className="max-h-[21rem] overflow-y-auto pr-1">
            {notifications.map((notification) => (
              <NotificationPreviewItem
                key={notification.id}
                notification={notification}
                disabled={mutatingId === notification.id || isPending}
                onDelete={() => {
                  void mutateNotification(notification.id, "delete")
                }}
                onMarkRead={() => {
                  void mutateNotification(notification.id, "read")
                }}
              />
            ))}
          </div>
        ) : null}

        {status === "ready" && notifications.length === 0 ? (
          <p className="px-2 py-5 text-sm text-muted-foreground">
            Non ci sono notifiche recenti.
          </p>
        ) : null}

        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={routes.accountNotifications} className="justify-center">
            Vedi tutte
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function NotificationPreviewItem({
  disabled,
  notification,
  onDelete,
  onMarkRead,
}: {
  disabled: boolean
  notification: Notification
  onDelete: () => void
  onMarkRead: () => void
}) {
  const title = getNotificationTitle(notification)
  const subtitle =
    readPayloadString(notification.payload, "listingTitle") ??
    "Aggiornamento account"

  return (
    <div className="grid gap-2 rounded-lg px-2 py-2.5 hover:bg-muted/70">
      <Link
        href={getNotificationHref(notification)}
        className="grid min-w-0 gap-1 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        <span className="flex min-w-0 items-center gap-2">
          {!notification.readAt ? (
            <span className="size-2 shrink-0 rounded-full bg-brand-coral-strong" />
          ) : null}
          <span className="truncate text-sm font-semibold">{title}</span>
        </span>
        <span className="line-clamp-2 text-xs leading-5 text-muted-foreground">
          {subtitle}
        </span>
        <span className="text-[0.7rem] text-muted-foreground">
          {formatDateTime(notification.createdAt)}
        </span>
      </Link>
      <div className="flex flex-wrap gap-1.5">
        {!notification.readAt ? (
          <Button
            type="button"
            variant="secondary"
            size="xs"
            disabled={disabled}
            onClick={(event) => {
              event.preventDefault()
              onMarkRead()
            }}
          >
            <CheckIcon aria-hidden="true" data-icon="inline-start" />
            Letta
          </Button>
        ) : null}
        <Button
          type="button"
          variant="destructive"
          size="xs"
          disabled={disabled}
          onClick={(event) => {
            event.preventDefault()
            onDelete()
          }}
        >
          <Trash2Icon aria-hidden="true" data-icon="inline-start" />
          Elimina
        </Button>
      </div>
    </div>
  )
}

function HeaderUserMenu({ user }: { user: AuthUser }) {
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Apri menu account"
          className="rounded-full border border-border/70 bg-card/78 p-0 shadow-sm hover:bg-brand-teal-soft"
        >
          <Avatar size="default">
            <AvatarFallback className="bg-brand-teal-soft text-xs font-semibold text-brand-teal-ink">
              {getUserInitials(user.displayName)}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={10} className="w-60">
        <DropdownMenuLabel>
          <span className="block truncate text-sm font-semibold text-foreground">
            {user.displayName}
          </span>
          <span className="block truncate text-xs font-normal text-muted-foreground">
            {user.email}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href={routes.account}>
              <UserIcon aria-hidden="true" />
              Profilo
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={routes.accountFavorites}>
              <HeartIcon aria-hidden="true" />I miei preferiti
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={routes.accountSettings}>
              <SettingsIcon aria-hidden="true" />
              Impostazioni
            </Link>
          </DropdownMenuItem>
          {canAccessModeration(user) ? (
            <DropdownMenuItem asChild>
              <Link href={routes.moderation}>
                <ShieldCheckIcon aria-hidden="true" />
                Moderazione
              </Link>
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <form action={logoutAction} className="px-1">
          <button
            type="submit"
            className="relative flex w-full cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-destructive outline-hidden select-none hover:bg-destructive/10 focus:bg-destructive/10 focus:text-destructive focus-visible:ring-2 focus-visible:ring-ring/50 [&_svg]:size-4 [&_svg]:shrink-0"
          >
            <LogOutIcon aria-hidden="true" />
            Esci
          </button>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function getUserInitials(displayName: string) {
  const words = displayName.trim().split(/\s+/).filter(Boolean).slice(0, 2)

  if (words.length === 0) {
    return "AU"
  }

  return words.map((word) => word[0]?.toUpperCase()).join("")
}

function canAccessModeration(user: AuthUser) {
  return (
    user.roles?.some((role) => role === "admin" || role === "moderator") ??
    false
  )
}

function getNotificationTitle(notification: Notification) {
  const decision = readPayloadString(notification.payload, "decision")

  if (notification.type === "listing_report_decision") {
    return `Segnalazione ${formatDecision(decision)}`
  }

  if (notification.type === "listing_review_submission") {
    return "Annuncio in revisione"
  }

  if (notification.type === "listing_contact_request") {
    const requester = readPayloadString(
      notification.payload,
      "requesterDisplayName"
    )

    return requester ? `Richiesta da ${requester}` : "Nuova richiesta"
  }

  return `Annuncio ${formatDecision(decision)}`
}

function getNotificationHref(notification: Notification) {
  if (notification.type === "listing_contact_request") {
    return routes.accountContacts
  }

  if (notification.type === "listing_review_submission") {
    return routes.accountListingSubmitted
  }

  const listingId = readPayloadString(notification.payload, "listingId")

  return listingId ? routes.listing(listingId) : routes.accountNotifications
}

function readPayloadString(payload: Record<string, unknown>, key: string) {
  const value = payload[key]

  return typeof value === "string" ? value : null
}

function formatDecision(value: string | null) {
  if (value === "approved") {
    return "approvato"
  }

  if (value === "rejected") {
    return "rifiutato"
  }

  if (value === "suspended") {
    return "sospeso"
  }

  return "aggiornato"
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("it-IT", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value))
}

export { HeaderAccountControls }
