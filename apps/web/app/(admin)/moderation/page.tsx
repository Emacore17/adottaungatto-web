import Link from "next/link"
import { redirect } from "next/navigation"
import {
  ArrowRightIcon,
  ClockIcon,
  FileTextIcon,
  HistoryIcon,
  ImageIcon,
  ListChecksIcon,
  ShieldAlertIcon,
} from "lucide-react"

import { formatModerationStatus } from "@/app/(admin)/moderation/_lib/moderation-labels"
import { StorageImage } from "@/components/shared/storage-image"
import { getPublicObjectUrl } from "@/lib/api/assets"
import {
  listPendingReviewModerationQueue,
  listRecentModerationActions,
  listReportedListingsModerationQueue,
  type ModerationQueueItem,
  type ModerationRecentActionItem,
  type ModerationRecentActionsResponse,
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

  const params = await searchParams
  const queueFilter = readQueueFilter(params.queue)
  const decision = readSingleParam(params.decision)
  const decisionCount = readSingleParam(params.decisionCount)
  const decisionFailed = readSingleParam(params.decisionFailed)
  const decisionError = readSingleParam(params.decisionError)
  const decisionListingId = readSingleParam(params.decisionListingId)
  const claim = readSingleParam(params.claim)
  const claimError = readSingleParam(params.claimError)
  const comment = readSingleParam(params.comment)
  const commentError = readSingleParam(params.commentError)

  const [pendingQueue, reportedQueue, recentActions] = await Promise.all([
    listPendingReviewModerationQueue(token, {
      page: 1,
      pageSize: dashboardPageSize,
    }),
    listReportedListingsModerationQueue(token, {
      page: 1,
      pageSize: dashboardPageSize,
    }),
    listRecentModerationActions(token, {
      page: 1,
      pageSize: 8,
    }),
  ])

  if (
    isApiStatus(pendingQueue, 401) ||
    isApiStatus(reportedQueue, 401) ||
    isApiStatus(recentActions, 401)
  ) {
    redirect(routes.login(routes.moderation))
  }

  if (
    isApiStatus(pendingQueue, 403) ||
    isApiStatus(reportedQueue, 403) ||
    isApiStatus(recentActions, 403)
  ) {
    redirect(routes.account)
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
        claim={claim}
        claimError={claimError}
        comment={comment}
        commentError={commentError}
        decision={decision}
        decisionCount={decisionCount}
        decisionFailed={decisionFailed}
        decisionListingId={decisionListingId}
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

      <RecentActivitySection result={recentActions} />

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

function RecentActivitySection({
  result,
}: {
  result: QueueResult<ModerationRecentActionsResponse>
}) {
  return (
    <section className="rounded-lg border bg-card shadow-sm">
      <div className="flex flex-col justify-between gap-3 border-b p-4 sm:flex-row sm:items-center">
        <div className="grid gap-1">
          <h2 className="flex items-center gap-2 text-lg font-semibold tracking-normal">
            <HistoryIcon aria-hidden="true" className="size-5" />
            Attivita recenti
          </h2>
          {result.ok ? (
            <p className="text-sm text-muted-foreground">
              Ultime {result.data.items.length} azioni registrate in audit
            </p>
          ) : null}
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href={routes.moderationActivity}>
            Vedi tutte
            <ArrowRightIcon aria-hidden="true" data-icon="inline-end" />
          </Link>
        </Button>
      </div>

      {result.ok && result.data.items.length > 0 ? (
        <div className="divide-y">
          {result.data.items.map((item) => (
            <RecentActivityRow key={item.action.id} item={item} />
          ))}
        </div>
      ) : null}

      {result.ok && result.data.items.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>Nessuna attivita recente</EmptyTitle>
            <EmptyDescription>
              Le decisioni e le assegnazioni compariranno qui.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : null}

      {!result.ok ? (
        <div className="p-4 text-sm text-destructive">{result.message}</div>
      ) : null}
    </section>
  )
}

function RecentActivityRow({ item }: { item: ModerationRecentActionItem }) {
  return (
    <article className="grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
      <div className="grid min-w-0 gap-1.5">
        <div className="flex flex-wrap gap-1.5">
          <Badge className={getRecentActionBadgeClass(item.action.type)}>
            {formatRecentActionLabel(item.action.type)}
          </Badge>
          <Badge variant="outline">
            {formatModerationStatus(item.listing.moderationStatus)}
          </Badge>
        </div>
        <h3 className="truncate text-sm font-semibold">{item.listing.title}</h3>
        <p className="truncate text-xs text-muted-foreground">
          {item.actor?.displayName ?? "Sistema"} - {item.owner.displayName}
        </p>
        <p className="truncate font-mono text-[11px] text-muted-foreground">
          Annuncio {item.listing.id} - Caso {item.case.id}
        </p>
        {item.action.reasonText ? (
          <p className="line-clamp-1 text-xs text-muted-foreground">
            {item.action.reasonText}
          </p>
        ) : null}
      </div>

      <p className="text-xs text-muted-foreground sm:text-right">
        {formatDateTime(item.action.createdAt)}
      </p>
    </article>
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
            {formatModerationStatus(item.listing.moderationStatus)}
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
  claim,
  claimError,
  comment,
  commentError,
  decision,
  decisionCount,
  decisionFailed,
  decisionListingId,
  error,
}: {
  claim: string | null
  claimError: string | null
  comment: string | null
  commentError: string | null
  decision: string | null
  decisionCount: string | null
  decisionFailed: string | null
  decisionListingId: string | null
  error: string | null
}) {
  if (
    !decision &&
    !error &&
    !claim &&
    !claimError &&
    !comment &&
    !commentError
  ) {
    return null
  }

  if (commentError) {
    return (
      <Card className="ring-destructive/35">
        <CardHeader>
          <CardTitle>Nota non salvata</CardTitle>
          <CardDescription>{formatCommentError(commentError)}</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (comment) {
    return (
      <Card className="ring-primary/25">
        <CardHeader>
          <CardTitle>Nota interna salvata</CardTitle>
          <CardDescription>
            La timeline del caso e&apos; stata aggiornata.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (claimError) {
    return (
      <Card className="ring-destructive/35">
        <CardHeader>
          <CardTitle>Caso non assegnato</CardTitle>
          <CardDescription>{formatClaimError(claimError)}</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (claim) {
    return (
      <Card className="ring-primary/25">
        <CardHeader>
          <CardTitle>Caso preso in carico</CardTitle>
          <CardDescription>
            La coda e&apos; stata aggiornata con la nuova assegnazione.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="ring-destructive/35">
        <CardHeader>
          <CardTitle>Decisione non salvata</CardTitle>
          <CardDescription>
            {formatDecisionError(error, decisionListingId)}
          </CardDescription>
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

function formatClaimError(value: string) {
  if (value === "already_assigned") {
    return "Il caso e' gia' in carico a un altro moderatore."
  }

  if (value === "invalid_case") {
    return "Il caso selezionato non e' valido."
  }

  return `Codice errore: ${value}.`
}

function formatCommentError(value: string) {
  if (value === "invalid_comment") {
    return "Scrivi una nota interna di almeno due caratteri."
  }

  return `Codice errore: ${value}.`
}

function formatDecisionError(value: string, listingId: string | null) {
  const listingSuffix = listingId ? ` Annuncio: ${listingId}.` : ""

  if (value === "assigned_elsewhere") {
    return `Il caso e' gia' in carico a un altro moderatore. Un admin puo applicare override, altrimenti chiedi il rilascio del caso.${listingSuffix}`
  }

  if (value === "already_decided") {
    return `Il caso e' gia' stato deciso o non e' piu in coda.${listingSuffix}`
  }

  if (value === "conflict") {
    return `Il caso e' cambiato mentre veniva salvata la decisione. Ricarica la coda e riprova.${listingSuffix}`
  }

  if (value === "rate_limited") {
    return "Troppe decisioni in poco tempo. Attendi qualche minuto e riprova."
  }

  if (value === "no_selection") {
    return "Seleziona almeno un caso prima di applicare una decisione."
  }

  if (value === "invalid_reason") {
    return "Scegli un motivo valido o scrivi una nota per il caso."
  }

  if (value === "invalid_action") {
    return "L'azione selezionata non e' valida."
  }

  if (value === "no_cases_updated") {
    return `Nessun caso e' stato aggiornato: potrebbe essere gia stato deciso o non essere piu disponibile.${listingSuffix}`
  }

  return `Codice errore: ${value}.${listingSuffix}`
}

function formatRecentActionLabel(
  value: ModerationRecentActionItem["action"]["type"]
) {
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

function getRecentActionBadgeClass(
  value: ModerationRecentActionItem["action"]["type"]
) {
  if (value === "approved") {
    return "bg-brand-teal-soft text-brand-teal-ink"
  }

  if (value === "rejected" || value === "reported") {
    return "bg-brand-coral-soft text-brand-coral-strong"
  }

  if (value === "suspended") {
    return "bg-brand-amber-soft text-brand-teal-ink"
  }

  return "bg-brand-olive-soft text-brand-teal-ink"
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
