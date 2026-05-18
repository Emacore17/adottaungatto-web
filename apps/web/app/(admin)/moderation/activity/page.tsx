import Link from "next/link"
import { redirect } from "next/navigation"
import { ArrowLeftIcon, HistoryIcon } from "lucide-react"

import {
  listRecentModerationActions,
  type ModerationRecentActionItem,
  type ModerationRecentActionsResponse,
} from "@/lib/api/moderation"
import { getSessionToken } from "@/lib/auth/session"
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
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@workspace/ui/components/empty"

type ModerationActivityPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

type QueueResult<T> =
  | {
      ok: true
      data: T
    }
  | {
      ok: false
      message: string
      status: number | null
    }

const activityPageSize = 25

export default async function ModerationActivityPage({
  searchParams,
}: ModerationActivityPageProps) {
  const token = await getSessionToken()

  if (!token) {
    redirect(routes.login(routes.moderationActivity))
  }

  const params = await searchParams
  const page = readPageParam(params.page)
  const recentActions = await listRecentModerationActions(token, {
    page,
    pageSize: activityPageSize,
  })

  if (isApiStatus(recentActions, 401)) {
    redirect(routes.login(routes.moderationActivity))
  }

  if (isApiStatus(recentActions, 403)) {
    redirect(routes.account)
  }

  const meta = recentActions.ok ? recentActions.data.meta : null

  return (
    <main className="flex w-full flex-1 flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <section className="flex flex-col justify-between gap-4 rounded-lg border bg-card p-4 shadow-sm sm:p-5 xl:flex-row xl:items-end">
        <div className="grid gap-3">
          <Badge className="w-fit bg-brand-teal-soft text-brand-teal-ink">
            <HistoryIcon aria-hidden="true" data-icon="inline-start" />
            Audit moderazione
          </Badge>
          <div className="grid gap-1">
            <h1 className="text-2xl font-semibold tracking-normal sm:text-3xl">
              Attivita di moderazione
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
              Vista paginata delle azioni registrate sui casi, con UUID annuncio
              e caso per diagnosi rapide.
            </p>
          </div>
        </div>

        <Button asChild variant="outline">
          <Link href={routes.moderation}>
            <ArrowLeftIcon aria-hidden="true" data-icon="inline-start" />
            Dashboard
          </Link>
        </Button>
      </section>

      {recentActions.ok && recentActions.data.items.length > 0 ? (
        <ActivityTable items={recentActions.data.items} />
      ) : null}

      {recentActions.ok && recentActions.data.items.length === 0 ? (
        <Empty className="border bg-card">
          <EmptyHeader>
            <EmptyTitle>Nessuna attivita</EmptyTitle>
            <EmptyDescription>
              Le azioni di moderazione compariranno qui appena registrate.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : null}

      {!recentActions.ok ? (
        <Card>
          <CardHeader>
            <CardTitle>Attivita non disponibili</CardTitle>
            <CardDescription>{recentActions.message}</CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {meta ? <ActivityPagination meta={meta} /> : null}
    </main>
  )
}

function ActivityTable({ items }: { items: ModerationRecentActionItem[] }) {
  return (
    <section className="overflow-x-auto rounded-lg border bg-card shadow-sm">
      <table className="w-full min-w-[980px] border-collapse text-sm">
        <thead className="bg-muted/60 text-xs text-muted-foreground">
          <tr className="border-b">
            <th className="px-3 py-3 text-left font-medium">Azione</th>
            <th className="px-3 py-3 text-left font-medium">Annuncio</th>
            <th className="px-3 py-3 text-left font-medium">Caso</th>
            <th className="px-3 py-3 text-left font-medium">Attore</th>
            <th className="px-3 py-3 text-left font-medium">Proprietario</th>
            <th className="px-3 py-3 text-left font-medium">Motivo</th>
            <th className="px-3 py-3 text-right font-medium">Data</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr
              key={item.action.id}
              className="border-b last:border-b-0 hover:bg-muted/35"
            >
              <td className="px-3 py-3 align-top">
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant="outline">
                    {formatActionLabel(item.action.type)}
                  </Badge>
                  <Badge className="bg-brand-teal-soft text-brand-teal-ink">
                    {item.listing.moderationStatus}
                  </Badge>
                </div>
              </td>
              <td className="max-w-[20rem] px-3 py-3 align-top">
                <div className="grid gap-1">
                  <span className="truncate font-medium">
                    {item.listing.title}
                  </span>
                  <span className="font-mono text-[11px] text-muted-foreground">
                    {item.listing.id}
                  </span>
                </div>
              </td>
              <td className="px-3 py-3 align-top">
                <div className="grid gap-1">
                  <span className="font-mono text-[11px] text-muted-foreground">
                    {item.case.id}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {item.case.assignedTo
                      ? `In carico a ${item.case.assignedTo.displayName}`
                      : "Non assegnato"}
                  </span>
                </div>
              </td>
              <td className="px-3 py-3 align-top">
                {item.actor?.displayName ?? "Sistema"}
              </td>
              <td className="px-3 py-3 align-top">
                <div className="grid gap-1">
                  <span>{item.owner.displayName}</span>
                  <span className="text-xs text-muted-foreground">
                    {item.owner.email}
                  </span>
                </div>
              </td>
              <td className="max-w-[18rem] px-3 py-3 align-top">
                <span className="line-clamp-2 text-muted-foreground">
                  {item.action.reasonText ??
                    item.action.reasonCode ??
                    "Nessun motivo registrato"}
                </span>
              </td>
              <td className="px-3 py-3 text-right align-top text-muted-foreground">
                {formatDateTime(item.action.createdAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}

function ActivityPagination({
  meta,
}: {
  meta: ModerationRecentActionsResponse["meta"]
}) {
  return (
    <nav
      aria-label="Paginazione attivita moderazione"
      className="flex flex-col justify-between gap-3 rounded-lg border bg-card p-3 sm:flex-row sm:items-center"
    >
      <p className="text-sm text-muted-foreground">
        Pagina {meta.page} di {Math.max(meta.totalPages, 1)} - {meta.total}{" "}
        azioni
      </p>
      <div className="flex gap-2">
        {meta.page <= 1 ? (
          <Button type="button" variant="outline" size="sm" disabled>
            Precedente
          </Button>
        ) : (
          <Button asChild variant="outline" size="sm">
            <Link href={createActivityHref(meta.page - 1)}>Precedente</Link>
          </Button>
        )}
        {meta.page >= meta.totalPages ? (
          <Button type="button" variant="outline" size="sm" disabled>
            Successiva
          </Button>
        ) : (
          <Button asChild variant="outline" size="sm">
            <Link href={createActivityHref(meta.page + 1)}>Successiva</Link>
          </Button>
        )}
      </div>
    </nav>
  )
}

function createActivityHref(page: number) {
  if (page <= 1) {
    return routes.moderationActivity
  }

  const params = new URLSearchParams({
    page: String(page),
  })

  return `${routes.moderationActivity}?${params.toString()}`
}

function readPageParam(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value
  const page = raw ? Number(raw) : 1

  return Number.isInteger(page) && page > 0 ? page : 1
}

function isApiStatus<T>(result: QueueResult<T>, status: number) {
  return !result.ok && result.status === status
}

function formatActionLabel(value: ModerationRecentActionItem["action"]["type"]) {
  if (value === "approved") {
    return "Approvato"
  }

  if (value === "rejected") {
    return "Rifiutato"
  }

  if (value === "suspended") {
    return "Sospeso"
  }

  if (value === "assigned") {
    return "Assegnato"
  }

  if (value === "reported") {
    return "Segnalato"
  }

  if (value === "commented") {
    return "Commento"
  }

  if (value === "closed") {
    return "Chiuso"
  }

  return "Aperto"
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("it-IT", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value))
}
