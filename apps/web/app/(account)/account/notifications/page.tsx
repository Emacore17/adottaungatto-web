import Link from "next/link"
import { CheckCheckIcon } from "lucide-react"

import { markAllNotificationsReadAction } from "@/app/(account)/account/actions"
import { AccountNotificationCard } from "@/app/(account)/account/_components/account-notification-card"
import { requireAccountSession } from "@/app/(account)/account/_lib/session"
import { listAccountNotifications } from "@/lib/api/account"
import { routes } from "@/lib/routes"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@workspace/ui/components/empty"

type NotificationsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

const pageSize = 16

export default async function NotificationsPage({
  searchParams,
}: NotificationsPageProps) {
  const params = await searchParams
  const page = readPageParam(params.page)
  const unreadOnly = readBooleanParam(params.unreadOnly)
  const currentPath = createNotificationsPageHref(page, unreadOnly)
  const { token } = await requireAccountSession(routes.accountNotifications)
  const notifications = await listAccountNotifications(token, {
    page,
    pageSize,
    unreadOnly,
  })

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div className="grid gap-2">
          <h1 className="text-3xl font-semibold tracking-normal">
            Notifiche
          </h1>
          <p className="text-sm text-muted-foreground">
            Aggiornamenti su annunci e segnalazioni.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant={unreadOnly ? "outline" : "default"} size="sm">
            <Link href={routes.accountNotifications}>Tutte</Link>
          </Button>
          <Button asChild variant={unreadOnly ? "default" : "outline"} size="sm">
            <Link href={`${routes.accountNotifications}?unreadOnly=true`}>
              Non lette
            </Link>
          </Button>
        </div>
      </div>

      {notifications.ok ? (
        <>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">
              {notifications.data.meta.total} totali
            </Badge>
            <Badge variant="outline">
              {notifications.data.meta.unreadCount} non lette
            </Badge>
            {notifications.data.meta.unreadCount > 0 ? (
              <form action={markAllNotificationsReadAction}>
                <input type="hidden" name="nextPath" value={currentPath} />
                <Button type="submit" variant="secondary" size="sm">
                  <CheckCheckIcon data-icon="inline-start" aria-hidden="true" />
                  Segna tutte lette
                </Button>
              </form>
            ) : null}
          </div>

          {notifications.data.items.length > 0 ? (
            <>
              <div className="grid gap-3 md:grid-cols-2">
                {notifications.data.items.map((notification) => (
                  <AccountNotificationCard
                    key={notification.id}
                    notification={notification}
                    returnPath={currentPath}
                  />
                ))}
              </div>
              <PaginationFooter
                page={notifications.data.meta.page}
                totalPages={notifications.data.meta.totalPages}
                unreadOnly={unreadOnly}
              />
            </>
          ) : (
            <Empty className="border">
              <EmptyHeader>
                <EmptyTitle>Nessuna notifica</EmptyTitle>
                <EmptyDescription>
                  Gli aggiornamenti appariranno in questa inbox.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button asChild variant="outline">
                  <Link href={routes.account}>Torna al profilo</Link>
                </Button>
              </EmptyContent>
            </Empty>
          )}
        </>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Notifiche non disponibili</CardTitle>
            <CardDescription>{notifications.message}</CardDescription>
          </CardHeader>
        </Card>
      )}
    </main>
  )
}

function PaginationFooter({
  page,
  totalPages,
  unreadOnly,
}: {
  page: number
  totalPages: number
  unreadOnly: boolean
}) {
  const safeTotalPages = Math.max(totalPages, 1)

  return (
    <div className="flex flex-col items-center justify-between gap-3 text-sm text-muted-foreground sm:flex-row">
      <span>
        Pagina {page} di {safeTotalPages}
      </span>
      <div className="flex gap-2">
        <Button asChild variant="outline" size="sm">
          <Link
            aria-disabled={page <= 1}
            href={createNotificationsPageHref(
              page > 1 ? page - 1 : 1,
              unreadOnly
            )}
          >
            Precedente
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link
            aria-disabled={page >= safeTotalPages}
            href={createNotificationsPageHref(
              page < safeTotalPages ? page + 1 : safeTotalPages,
              unreadOnly
            )}
          >
            Successiva
          </Link>
        </Button>
      </div>
    </div>
  )
}

function createNotificationsPageHref(page: number, unreadOnly: boolean) {
  const params = new URLSearchParams()

  if (page > 1) {
    params.set("page", String(page))
  }

  if (unreadOnly) {
    params.set("unreadOnly", "true")
  }

  const query = params.toString()

  return query
    ? `${routes.accountNotifications}?${query}`
    : routes.accountNotifications
}

function readPageParam(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value
  const page = raw ? Number(raw) : 1

  return Number.isInteger(page) && page > 0 ? page : 1
}

function readBooleanParam(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value

  return raw === "true" || raw === "1"
}
