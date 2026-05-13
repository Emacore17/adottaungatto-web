import Link from "next/link"
import { redirect } from "next/navigation"
import {
  ArrowRightIcon,
  ClockIcon,
  FileTextIcon,
  ImageIcon,
  ListChecksIcon,
  ShieldAlertIcon,
} from "lucide-react"

import { StorageImage } from "@/components/shared/storage-image"
import { currentSession } from "@/lib/api/auth"
import { getPublicObjectUrl } from "@/lib/api/assets"
import {
  listPendingReviewModerationQueue,
  listReportedListingsModerationQueue,
  type ModerationQueueItem,
  type ReportedListingQueueItem,
} from "@/lib/api/moderation"
import { getSessionToken } from "@/lib/auth/session"
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
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@workspace/ui/components/empty"
import { cn } from "@workspace/ui/lib/utils"

type ModerationPageProps = {
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

type ModerationQueueFilter = "all" | "pending" | "reported"
type ModerationPreviewItem = ModerationQueueItem | ReportedListingQueueItem

const dashboardPageSize = 5

const moderationQueueFilters = [
  { label: "Tutto", value: "all" },
  { label: "In revisione", value: "pending" },
  { label: "Segnalati", value: "reported" },
] as const

export default async function ModerationPage({
  searchParams,
}: ModerationPageProps) {
  const token = await getSessionToken()

  if (!token) {
    redirect(routes.login(routes.moderation))
  }

  const session = await currentSession(token)

  if (!session.ok) {
    redirect(routes.login(routes.moderation))
  }

  const params = await searchParams
  const queueFilter = readQueueFilter(params.queue)
  const decision = readSingleParam(params.decision)
  const decisionCount = readSingleParam(params.decisionCount)
  const decisionFailed = readSingleParam(params.decisionFailed)
  const decisionError = readSingleParam(params.decisionError)

  const [pendingQueue, reportedQueue] = await Promise.all([
    listPendingReviewModerationQueue(token, {
      page: 1,
      pageSize: dashboardPageSize,
    }),
    listReportedListingsModerationQueue(token, {
      page: 1,
      pageSize: dashboardPageSize,
    }),
  ])

  if (isApiStatus(pendingQueue, 401) || isApiStatus(reportedQueue, 401)) {
    redirect(routes.login(routes.moderation))
  }

  if (isApiStatus(pendingQueue, 403) || isApiStatus(reportedQueue, 403)) {
    return <AccessDenied displayName={session.data.user.displayName} />
  }

  const pendingTotal = pendingQueue.ok ? pendingQueue.data.meta.total : null
  const reportedTotal = reportedQueue.ok ? reportedQueue.data.meta.total : null
  const totalOpen =
    pendingTotal !== null && reportedTotal !== null
      ? pendingTotal + reportedTotal
      : null

  return (
    <main className="flex w-full flex-1 flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <section className="grid gap-4 rounded-lg border bg-card p-4 shadow-sm sm:p-5 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
        <div className="grid gap-3">
          <div className="flex flex-wrap gap-2">
            <Badge className="w-fit bg-brand-teal-soft text-brand-teal-ink">
              Dashboard moderazione
            </Badge>
            <Badge
              variant="outline"
              className="w-fit border-brand-olive/30 bg-brand-olive-soft text-brand-teal-ink"
            >
              Area interna
            </Badge>
          </div>
          <div className="grid gap-1">
            <h1 className="text-2xl font-semibold tracking-normal sm:text-3xl">
              Controllo code
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
              Stato operativo delle revisioni e accesso rapido alla coda
              tabellare.
            </p>
          </div>
        </div>

        <Button asChild>
          <Link href={routes.moderationQueue}>
            <ListChecksIcon aria-hidden="true" data-icon="inline-start" />
            Apri coda rapida
          </Link>
        </Button>
      </section>

      <DecisionFeedback
        decision={decision}
        decisionCount={decisionCount}
        decisionFailed={decisionFailed}
        error={decisionError}
      />

      <section className="grid gap-3 md:grid-cols-3">
        <MetricCard
          description="Da pubblicare o rifiutare"
          href={`${routes.moderationQueue}?queue=pending`}
          icon="pending"
          label="In revisione"
          value={pendingTotal}
        />
        <MetricCard
          description="Contenuti gia pubblicati segnalati"
          href={`${routes.moderationQueue}?queue=reported`}
          icon="reported"
          label="Segnalati"
          value={reportedTotal}
        />
        <MetricCard
          description="Casi aperti complessivi"
          href={routes.moderationQueue}
          icon="total"
          label="Totale aperti"
          value={totalOpen}
        />
      </section>

      <QueueFilterNav activeFilter={queueFilter} />

      <div className="grid gap-4 xl:grid-cols-2">
        {queueFilter !== "reported" ? (
          <QueuePreviewSection
            actionHref={`${routes.moderationQueue}?queue=pending`}
            emptyDescription="Non ci sono annunci in attesa."
            emptyTitle="Coda in revisione vuota"
            result={pendingQueue}
            title="Annunci in attesa"
          />
        ) : null}

        {queueFilter !== "pending" ? (
          <QueuePreviewSection
            actionHref={`${routes.moderationQueue}?queue=reported`}
            emptyDescription="Non ci sono segnalazioni aperte."
            emptyTitle="Coda segnalazioni vuota"
            result={reportedQueue}
            title="Annunci segnalati"
          />
        ) : null}
      </div>
    </main>
  )
}

function MetricCard({
  description,
  href,
  icon,
  label,
  value,
}: {
  description: string
  href: string
  icon: "pending" | "reported" | "total"
  label: string
  value: number | null
}) {
  const Icon =
    icon === "pending"
      ? FileTextIcon
      : icon === "reported"
        ? ShieldAlertIcon
        : ClockIcon

  return (
    <Card className="gap-3">
      <CardHeader className="flex-row items-start justify-between gap-3">
        <div className="grid gap-1">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {label}
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <span
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-md",
            icon === "reported"
              ? "bg-brand-coral-soft text-brand-coral-strong"
              : "bg-brand-teal-soft text-brand-teal-ink"
          )}
        >
          <Icon aria-hidden="true" />
        </span>
      </CardHeader>
      <CardContent className="flex items-end justify-between gap-3">
        <p className="text-3xl font-semibold tracking-normal tabular-nums">
          {value ?? "-"}
        </p>
        <Button asChild variant="ghost" size="sm">
          <Link href={href}>
            Apri
            <ArrowRightIcon aria-hidden="true" data-icon="inline-end" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}

function QueueFilterNav({
  activeFilter,
}: {
  activeFilter: ModerationQueueFilter
}) {
  return (
    <nav aria-label="Filtro code moderazione" className="flex flex-wrap gap-2">
      {moderationQueueFilters.map((filter) => {
        const isActive = filter.value === activeFilter

        return (
          <Button
            key={filter.value}
            asChild
            variant={isActive ? "default" : "outline"}
            size="sm"
          >
            <Link
              href={moderationQueueHref(filter.value)}
              aria-current={isActive ? "page" : undefined}
            >
              {filter.label}
            </Link>
          </Button>
        )
      })}
    </nav>
  )
}

function QueuePreviewSection<Item extends ModerationPreviewItem>({
  actionHref,
  emptyDescription,
  emptyTitle,
  result,
  title,
}: {
  actionHref: string
  emptyDescription: string
  emptyTitle: string
  result: QueueResult<{
    items: Item[]
    meta: {
      total: number
    }
  }>
  title: string
}) {
  return (
    <section className="rounded-lg border bg-card shadow-sm">
      <div className="flex flex-col justify-between gap-3 border-b p-4 sm:flex-row sm:items-center">
        <div className="grid gap-1">
          <h2 className="text-lg font-semibold tracking-normal">{title}</h2>
          {result.ok ? (
            <p className="text-sm text-muted-foreground">
              {result.data.meta.total} casi aperti
            </p>
          ) : null}
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href={actionHref}>
            Gestisci
            <ArrowRightIcon aria-hidden="true" data-icon="inline-end" />
          </Link>
        </Button>
      </div>

      {result.ok && result.data.items.length > 0 ? (
        <div className="divide-y">
          {result.data.items.map((item) => (
            <QueuePreviewRow key={item.case.id} item={item} />
          ))}
        </div>
      ) : null}

      {result.ok && result.data.items.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>{emptyTitle}</EmptyTitle>
            <EmptyDescription>{emptyDescription}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : null}

      {!result.ok ? (
        <div className="p-4 text-sm text-destructive">{result.message}</div>
      ) : null}
    </section>
  )
}

function QueuePreviewRow({ item }: { item: ModerationPreviewItem }) {
  const coverUrl = getPublicObjectUrl(
    item.images.cover?.objectKeyThumb ?? item.images.cover?.objectKeyLarge
  )
  const reportCount = "reports" in item ? item.reports.count : null

  return (
    <article className="grid gap-3 p-4 sm:grid-cols-[4.5rem_minmax(0,1fr)_auto] sm:items-center">
      <div className="relative aspect-[4/3] overflow-hidden rounded-md bg-muted sm:aspect-square">
        {coverUrl ? (
          <StorageImage
            src={coverUrl}
            alt={item.listing.title}
            fill
            className="object-cover"
            sizes="5rem"
          />
        ) : (
          <div className="flex size-full items-center justify-center text-muted-foreground">
            <ImageIcon aria-hidden="true" />
          </div>
        )}
      </div>

      <div className="grid min-w-0 gap-1">
        <div className="flex flex-wrap gap-1.5">
          <Badge className="bg-brand-teal-soft text-brand-teal-ink">
            {item.listing.moderationStatus}
          </Badge>
          {reportCount !== null ? (
            <Badge
              variant="outline"
              className="border-brand-coral/25 bg-brand-coral-soft text-brand-coral-strong"
            >
              {reportCount} report
            </Badge>
          ) : null}
        </div>
        <h3 className="truncate text-sm font-semibold">{item.listing.title}</h3>
        <p className="truncate text-xs text-muted-foreground">
          {item.owner.displayName} - {formatLocation(item.location)}
        </p>
      </div>

      <p className="text-xs text-muted-foreground sm:text-right">
        {formatDateTime(item.case.openedAt)}
      </p>
    </article>
  )
}

function DecisionFeedback({
  decision,
  decisionCount,
  decisionFailed,
  error,
}: {
  decision: string | null
  decisionCount: string | null
  decisionFailed: string | null
  error: string | null
}) {
  if (!decision && !error) {
    return null
  }

  if (error) {
    return (
      <Card className="ring-destructive/35">
        <CardHeader>
          <CardTitle>Decisione non salvata</CardTitle>
          <CardDescription>Codice errore: {error}.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card className="ring-primary/25">
      <CardHeader>
        <CardTitle>Decisione salvata</CardTitle>
        <CardDescription>
          {formatDecisionAction(decision)} applicata a {decisionCount ?? "1"}{" "}
          casi
          {decisionFailed ? `, ${decisionFailed} non aggiornati` : ""}.
        </CardDescription>
      </CardHeader>
    </Card>
  )
}

function AccessDenied({ displayName }: { displayName: string }) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 px-4 py-10 sm:px-6 lg:px-8">
      <Empty className="border bg-card">
        <EmptyHeader>
          <EmptyTitle>Accesso alla moderazione non consentito</EmptyTitle>
          <EmptyDescription>
            {displayName} non ha un ruolo abilitato per le code di moderazione.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button asChild variant="outline">
            <Link href={routes.account}>Torna al profilo</Link>
          </Button>
        </EmptyContent>
      </Empty>
    </main>
  )
}

function isApiStatus<T>(result: QueueResult<T>, status: number) {
  return !result.ok && result.status === status
}

function readSingleParam(value: string | string[] | undefined) {
  return typeof value === "string" ? value : null
}

function readQueueFilter(value: string | string[] | undefined) {
  const raw = readSingleParam(value)

  if (raw === "pending" || raw === "reported") {
    return raw
  }

  return "all"
}

function moderationQueueHref(filter: ModerationQueueFilter) {
  if (filter === "all") {
    return routes.moderation
  }

  const params = new URLSearchParams({
    queue: filter,
  })

  return `${routes.moderation}?${params.toString()}`
}

function formatDecisionAction(value: string | null) {
  if (value === "approve") {
    return "Approvazione"
  }

  if (value === "reject") {
    return "Rifiuto"
  }

  if (value === "suspend") {
    return "Sospensione"
  }

  return "Decisione"
}

function formatLocation(
  location:
    | ModerationQueueItem["location"]
    | ReportedListingQueueItem["location"]
) {
  if (!location) {
    return "Non indicato"
  }

  return `${location.municipality.name}, ${location.province.name}`
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("it-IT", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value))
}
