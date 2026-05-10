import Link from "next/link"
import { CheckIcon } from "lucide-react"

import { markNotificationReadAction } from "@/app/(account)/account/actions"
import type { Notification } from "@/lib/api/account"
import { routes } from "@/lib/routes"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"

type AccountNotificationCardProps = {
  notification: Notification
  returnPath?: string
}

function AccountNotificationCard({
  notification,
  returnPath,
}: AccountNotificationCardProps) {
  const title = getNotificationTitle(notification)
  const listingId = readPayloadString(notification.payload, "listingId")
  const listingTitle = readPayloadString(notification.payload, "listingTitle")
  const reason = readPayloadString(notification.payload, "reasonText")

  return (
    <Card>
      <CardHeader className="gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={notification.readAt ? "outline" : "default"}>
            {notification.readAt ? "Letta" : "Non letta"}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {formatDateTime(notification.createdAt)}
          </span>
        </div>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>
          {listingTitle ?? "Aggiornamento account"}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {reason ? (
          <p className="line-clamp-2 text-sm text-muted-foreground">
            {reason}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          {listingId ? (
            <Button asChild variant="outline" size="sm">
              <Link href={routes.listing(listingId)}>Apri annuncio</Link>
            </Button>
          ) : null}
          {returnPath && !notification.readAt ? (
            <form action={markNotificationReadAction}>
              <input
                type="hidden"
                name="notificationId"
                value={notification.id}
              />
              <input type="hidden" name="nextPath" value={returnPath} />
              <Button type="submit" variant="secondary" size="sm">
                <CheckIcon data-icon="inline-start" aria-hidden="true" />
                Segna letta
              </Button>
            </form>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}

function getNotificationTitle(notification: Notification) {
  const decision = readPayloadString(notification.payload, "decision")

  if (notification.type === "listing_report_decision") {
    return `Segnalazione ${formatDecision(decision)}`
  }

  return `Annuncio ${formatDecision(decision)}`
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
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
}

export { AccountNotificationCard }
