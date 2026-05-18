import Link from "next/link"
import { redirect } from "next/navigation"
import {
  ArrowLeftIcon,
  ListChecksIcon,
  ShieldAlertIcon,
  SlidersHorizontalIcon,
} from "lucide-react"

import { ModerationQueueTable } from "@/app/(admin)/moderation/_components/moderation-queue-table"
import {
  listPendingReviewModerationQueue,
  listReportedListingsModerationQueue,
  type ModerationQueueResponse,
  type ReportedListingQueueResponse,
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
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@workspace/ui/components/empty"

type ModerationQueuePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

type QueueType = "pending" | "reported"

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

const queuePageSize = 25

export default async function ModerationQueuePage({
  searchParams,
}: ModerationQueuePageProps) {
  const token = await getSessionToken()

  if (!token) {
    redirect(routes.login(routes.moderationQueue))
  }

  const params = await searchParams
  const queue = readQueueType(params.queue)
  const page = readPageParam(params.page)
  const decision = readSingleParam(params.decision)
  const decisionCount = readSingleParam(params.decisionCount)
  const decisionFailed = readSingleParam(params.decisionFailed)
  const decisionError = readSingleParam(params.decisionError)
  const decisionListingId = readSingleParam(params.decisionListingId)
  const claim = readSingleParam(params.claim)
  const claimError = readSingleParam(params.claimError)
  const comment = readSingleParam(params.comment)
  const commentError = readSingleParam(params.commentError)

  const [pendingQueue, reportedQueue] = await Promise.all([
    listPendingReviewModerationQueue(token, {
      page: queue === "pending" ? page : 1,
      pageSize: queuePageSize,
    }),
    listReportedListingsModerationQueue(token, {
      page: queue === "reported" ? page : 1,
      pageSize: queuePageSize,
    }),
  ])

  if (isApiStatus(pendingQueue, 401) || isApiStatus(reportedQueue, 401)) {
    redirect(routes.login(routes.moderationQueue))
  }

  if (isApiStatus(pendingQueue, 403) || isApiStatus(reportedQueue, 403)) {
    redirect(routes.account)
  }

  const activeQueue = queue === "pending" ? pendingQueue : reportedQueue
  const activeItems = activeQueue.ok ? activeQueue.data.items : []
  const activeMeta = activeQueue.ok ? activeQueue.data.meta : null
  const nextPath = createQueueHref(queue, page)

  return (
    <main className="flex w-full flex-1 flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <section className="flex flex-col gap-4 rounded-lg border bg-card p-4 shadow-sm sm:p-5">
        <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
          <div className="grid gap-3">
            <div className="flex flex-wrap gap-2">
              <Badge className="w-fit bg-brand-teal-soft text-brand-teal-ink">
                <ListChecksIcon aria-hidden="true" data-icon="inline-start" />
                Coda rapida
              </Badge>
              <Badge
                variant="outline"
                className="w-fit border-brand-amber/30 bg-brand-amber-soft text-brand-teal-ink"
              >
                Vista tabellare
              </Badge>
            </div>
            <div className="grid gap-1">
              <h1 className="text-2xl font-semibold tracking-normal sm:text-3xl">
                Revisione operativa
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                Seleziona piu casi, controlla le foto e applica decisioni in
                blocco.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button asChild variant="outline">
              <Link href={routes.moderation}>
                <ArrowLeftIcon aria-hidden="true" data-icon="inline-start" />
                Dashboard
              </Link>
            </Button>
          </div>
        </div>
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

      <QueueSwitcher
        pendingQueue={pendingQueue}
        reportedQueue={reportedQueue}
        selectedQueue={queue}
      />

      {activeQueue.ok && activeItems.length > 0 ? (
        <ModerationQueueTable
          items={activeItems}
          nextPath={nextPath}
          queue={queue}
        />
      ) : null}

      {activeQueue.ok && activeItems.length === 0 ? (
        <Empty className="border bg-card">
          <EmptyHeader>
            <EmptyTitle>Coda vuota</EmptyTitle>
            <EmptyDescription>
              Non ci sono casi aperti per questa vista.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button asChild variant="outline">
              <Link href={routes.moderation}>Torna alla dashboard</Link>
            </Button>
          </EmptyContent>
        </Empty>
      ) : null}

      {!activeQueue.ok ? (
        <Card>
          <CardHeader>
            <CardTitle>Coda non disponibile</CardTitle>
            <CardDescription>{activeQueue.message}</CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {activeMeta ? (
        <nav
          aria-label="Paginazione coda moderazione"
          className="flex flex-col justify-between gap-3 rounded-lg border bg-card p-3 sm:flex-row sm:items-center"
        >
          <p className="text-sm text-muted-foreground">
            Pagina {activeMeta.page} di {Math.max(activeMeta.totalPages, 1)} -{" "}
            {activeMeta.total} casi
          </p>
          <div className="flex gap-2">
            {activeMeta.page <= 1 ? (
              <Button type="button" variant="outline" size="sm" disabled>
                Precedente
              </Button>
            ) : (
              <Button asChild variant="outline" size="sm">
                <Link href={createQueueHref(queue, activeMeta.page - 1)}>
                  Precedente
                </Link>
              </Button>
            )}
            {activeMeta.page >= activeMeta.totalPages ? (
              <Button type="button" variant="outline" size="sm" disabled>
                Successiva
              </Button>
            ) : (
              <Button asChild variant="outline" size="sm">
                <Link href={createQueueHref(queue, activeMeta.page + 1)}>
                  Successiva
                </Link>
              </Button>
            )}
          </div>
        </nav>
      ) : null}
    </main>
  )
}

function QueueSwitcher({
  pendingQueue,
  reportedQueue,
  selectedQueue,
}: {
  pendingQueue: QueueResult<ModerationQueueResponse>
  reportedQueue: QueueResult<ReportedListingQueueResponse>
  selectedQueue: QueueType
}) {
  const filters = [
    {
      count: pendingQueue.ok ? pendingQueue.data.meta.total : null,
      href: createQueueHref("pending", 1),
      icon: SlidersHorizontalIcon,
      label: "In revisione",
      value: "pending",
    },
    {
      count: reportedQueue.ok ? reportedQueue.data.meta.total : null,
      href: createQueueHref("reported", 1),
      icon: ShieldAlertIcon,
      label: "Segnalati",
      value: "reported",
    },
  ] as const

  return (
    <nav aria-label="Code operative" className="flex flex-wrap gap-2">
      {filters.map((filter) => {
        const Icon = filter.icon
        const isActive = filter.value === selectedQueue

        return (
          <Button
            key={filter.value}
            asChild
            variant={isActive ? "default" : "outline"}
          >
            <Link
              href={filter.href}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon aria-hidden="true" data-icon="inline-start" />
              {filter.label}
              {filter.count !== null ? (
                <span className="ml-1 tabular-nums">{filter.count}</span>
              ) : null}
            </Link>
          </Button>
        )
      })}
    </nav>
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

function isApiStatus<T>(result: QueueResult<T>, status: number) {
  return !result.ok && result.status === status
}

function readPageParam(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value
  const page = raw ? Number(raw) : 1

  return Number.isInteger(page) && page > 0 ? page : 1
}

function readSingleParam(value: string | string[] | undefined) {
  return typeof value === "string" ? value : null
}

function readQueueType(value: string | string[] | undefined): QueueType {
  const raw = readSingleParam(value)

  return raw === "reported" ? "reported" : "pending"
}

function createQueueHref(queue: QueueType, page: number) {
  const params = new URLSearchParams({
    queue,
  })

  if (page > 1) {
    params.set("page", String(page))
  }

  return `${routes.moderationQueue}?${params.toString()}`
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
