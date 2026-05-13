import Link from "next/link"
import { redirect } from "next/navigation"
import {
  AlertTriangleIcon,
  CheckIcon,
  CirclePauseIcon,
  FileTextIcon,
  HistoryIcon,
  ImageIcon,
  ShieldAlertIcon,
  XCircleIcon,
} from "lucide-react"

import { decideModerationCaseAction } from "@/app/(admin)/moderation/actions"
import { StorageImage } from "@/components/shared/storage-image"
import { currentSession } from "@/lib/api/auth"
import { getPublicObjectUrl } from "@/lib/api/assets"
import {
  listPendingReviewModerationQueue,
  listReportedListingsModerationQueue,
  type ModerationQueueItem,
  type ModerationQueueResponse,
  type ReportedListingQueueItem,
  type ReportedListingQueueResponse,
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
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@workspace/ui/components/field"
import { Separator } from "@workspace/ui/components/separator"
import { Textarea } from "@workspace/ui/components/textarea"

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

const queuePageSize = 8

const moderationQueueFilters = [
  { label: "Tutte le code", value: "all" },
  { label: "In revisione", value: "pending" },
  { label: "Segnalati", value: "reported" },
] as const

const reasonSelectClassName =
  "h-10 w-full rounded-md border border-input bg-card/80 px-2.5 text-sm text-foreground shadow-xs outline-none transition-[background-color,color,box-shadow] focus-visible:border-ring focus-visible:bg-card focus-visible:ring-3 focus-visible:ring-ring/50"

const moderationReasonOptions = [
  { label: "Approva: conforme alle policy", value: "policy_ok" },
  { label: "Rifiuta: contenuto non conforme", value: "policy_violation" },
  { label: "Rifiuta: informazioni insufficienti", value: "incomplete_listing" },
  { label: "Sospendi: rischio da verificare", value: "risk_review" },
  { label: "Altro: usa nota obbligatoria", value: "other" },
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
  const pendingPage = readPageParam(params.pendingPage)
  const reportedPage = readPageParam(params.reportedPage)
  const queueFilter = readQueueFilter(params.queue)
  const decision = readSingleParam(params.decision)
  const decisionError = readSingleParam(params.decisionError)

  const [pendingQueue, reportedQueue] = await Promise.all([
    listPendingReviewModerationQueue(token, {
      page: pendingPage,
      pageSize: queuePageSize,
    }),
    listReportedListingsModerationQueue(token, {
      page: reportedPage,
      pageSize: queuePageSize,
    }),
  ])

  if (isApiStatus(pendingQueue, 401) || isApiStatus(reportedQueue, 401)) {
    redirect(routes.login(routes.moderation))
  }

  if (isApiStatus(pendingQueue, 403) || isApiStatus(reportedQueue, 403)) {
    return <AccessDenied displayName={session.data.user.displayName} />
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-3">
        <Badge
          variant="outline"
          className="w-fit border-brand-teal/25 bg-brand-teal-soft text-brand-teal-ink"
        >
          Code operative
        </Badge>
        <div className="grid gap-2">
          <h1 className="text-3xl font-semibold tracking-normal">
            Dashboard moderazione
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            Coda iniziale per revisionare annunci in attesa e casi aperti da
            segnalazioni. Le autorizzazioni e le decisioni restano applicate
            dalle API.
          </p>
        </div>
      </div>

      <DecisionFeedback decision={decision} error={decisionError} />

      <div className="grid gap-4 md:grid-cols-2">
        <QueueSummaryCard
          title="In revisione"
          description="Annunci inviati dai proprietari"
          icon="pending"
          result={pendingQueue}
        />
        <QueueSummaryCard
          title="Segnalati"
          description="Casi aperti da segnalazioni utenti"
          icon="reported"
          result={reportedQueue}
        />
      </div>

      <QueueFilterNav activeFilter={queueFilter} />

      {queueFilter !== "reported" ? (
        <QueueSection
          title="Annunci in attesa"
          description="Annunci inviati a moderazione prima della pubblicazione."
          emptyTitle="Nessun annuncio in attesa"
          emptyDescription="La coda pending_review e' vuota."
          result={pendingQueue}
          renderItem={(item) => <ModerationItemCard item={item} />}
        />
      ) : null}

      {queueFilter !== "pending" ? (
        <QueueSection
          title="Annunci segnalati"
          description="Casi aperti dopo report su annunci pubblicati o sospetti."
          emptyTitle="Nessuna segnalazione aperta"
          emptyDescription="La coda delle segnalazioni e' vuota."
          result={reportedQueue}
          renderItem={(item) => <ModerationItemCard item={item} />}
        />
      ) : null}
    </main>
  )
}

function QueueSummaryCard({
  description,
  icon,
  result,
  title,
}: {
  description: string
  icon: "pending" | "reported"
  result: QueueResult<ModerationQueueResponse | ReportedListingQueueResponse>
  title: string
}) {
  const Icon = icon === "pending" ? FileTextIcon : ShieldAlertIcon
  const count = result.ok ? result.data.meta.total : null
  const iconClassName =
    icon === "pending"
      ? "bg-brand-amber-soft text-brand-teal-ink"
      : "bg-brand-coral-soft text-brand-coral-strong"

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-4">
        <div className="grid gap-1">
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <div
          className={`flex size-10 shrink-0 items-center justify-center rounded-md ${iconClassName}`}
        >
          <Icon aria-hidden="true" className="size-5" />
        </div>
      </CardHeader>
      <CardContent>
        {result.ok ? (
          <p className="text-3xl font-semibold tracking-normal">{count}</p>
        ) : (
          <p className="text-sm text-destructive">
            Coda non disponibile: {result.message}
          </p>
        )}
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

function QueueSection<Item>({
  description,
  emptyDescription,
  emptyTitle,
  renderItem,
  result,
  title,
}: {
  description: string
  emptyDescription: string
  emptyTitle: string
  renderItem: (item: Item) => React.ReactNode
  result: QueueResult<{
    items: Item[]
    meta: {
      page: number
      pageSize: number
      total: number
      totalPages: number
    }
  }>
  title: string
}) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
        <div className="grid gap-1">
          <h2 className="text-2xl font-semibold tracking-normal">{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        {result.ok ? (
          <p className="text-sm text-muted-foreground">
            Pagina {result.data.meta.page} di{" "}
            {Math.max(result.data.meta.totalPages, 1)}
          </p>
        ) : null}
      </div>

      {result.ok && result.data.items.length > 0 ? (
        <div className="grid gap-3">{result.data.items.map(renderItem)}</div>
      ) : null}

      {result.ok && result.data.items.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyTitle>{emptyTitle}</EmptyTitle>
            <EmptyDescription>{emptyDescription}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : null}

      {!result.ok ? (
        <Card>
          <CardHeader>
            <CardTitle>Coda non disponibile</CardTitle>
            <CardDescription>{result.message}</CardDescription>
          </CardHeader>
        </Card>
      ) : null}
    </section>
  )
}

function ModerationItemCard({
  item,
}: {
  item: ModerationQueueItem | ReportedListingQueueItem
}) {
  const coverUrl = getPublicObjectUrl(
    item.images.cover?.objectKeyThumb ?? item.images.cover?.objectKeyLarge
  )
  const location = formatLocation(item.location)
  const reportCount = "reports" in item ? item.reports.count : null
  const latestReport = "reports" in item ? item.reports.latest : null

  return (
    <Card>
      <CardContent className="grid gap-4 p-4 md:grid-cols-[8rem_minmax(0,1fr)]">
        <div className="relative aspect-[4/3] overflow-hidden rounded-md bg-muted md:aspect-square">
          {coverUrl ? (
            <StorageImage
              src={coverUrl}
              alt={item.listing.title}
              fill
              className="object-cover"
              sizes="8rem"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              <ImageIcon aria-hidden="true" className="size-6" />
            </div>
          )}
        </div>

        <div className="min-w-0">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="grid min-w-0 gap-1">
              <div className="flex flex-wrap items-center gap-2">
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
              <h3 className="text-lg font-semibold tracking-normal">
                {item.listing.title}
              </h3>
              <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">
                {item.listing.description}
              </p>
            </div>

            <div className="grid gap-1 text-sm lg:min-w-48 lg:text-right">
              <span className="text-muted-foreground">Aperto</span>
              <span>{formatDateTime(item.case.openedAt)}</span>
            </div>
          </div>

          <Separator className="my-4" />

          <div className="grid gap-3 text-sm md:grid-cols-3">
            <InfoBlock label="Proprietario" value={item.owner.displayName} />
            <InfoBlock label="Luogo" value={location} />
            <InfoBlock
              label="Immagini pronte"
              value={String(item.images.readyCount)}
            />
          </div>

          <OperationalCaseDetails item={item} />
          <ModerationAuditTrail item={item} />

          {latestReport ? (
            <div className="mt-4 rounded-md border border-brand-coral/20 bg-brand-coral-soft p-3 text-sm text-brand-coral-strong">
              <div className="flex items-start gap-2">
                <AlertTriangleIcon
                  aria-hidden="true"
                  className="mt-0.5 size-4 shrink-0"
                />
                <div className="grid gap-1">
                  <p className="font-medium">
                    Ultima segnalazione: {latestReport.reasonCode}
                  </p>
                  {latestReport.description ? (
                    <p className="line-clamp-2">{latestReport.description}</p>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}

          <ModerationDecisionForm caseId={item.case.id} />
        </div>
      </CardContent>
    </Card>
  )
}

function ModerationAuditTrail({
  item,
}: {
  item: ModerationQueueItem | ReportedListingQueueItem
}) {
  return (
    <section
      aria-label="Audit caso"
      className="mt-4 rounded-md border bg-card/80 p-3"
    >
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">
            <HistoryIcon aria-hidden="true" />
            Audit caso
          </Badge>
          <span className="text-xs text-muted-foreground">
            Ultime {item.audit.actions.length} azioni registrate
          </span>
        </div>
        <p className="text-xs leading-5 text-muted-foreground">
          Storico essenziale alimentato da `moderation_actions`, utile per
          ricostruire apertura, segnalazioni e decisioni.
        </p>
      </div>

      {item.audit.actions.length > 0 ? (
        <div className="mt-3 grid gap-2">
          {item.audit.actions.map((action) => (
            <div
              key={action.id}
              className="grid gap-2 rounded-md border bg-muted/20 p-3 text-xs md:grid-cols-[minmax(0,1fr)_auto]"
            >
              <div className="grid min-w-0 gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="bg-brand-amber-soft text-brand-teal-ink">
                    Azione {formatAuditAction(action.action)}
                  </Badge>
                  <span className="text-muted-foreground">
                    {formatDateTime(action.createdAt)}
                  </span>
                </div>
                <p className="font-medium break-words">
                  {formatAuditStatusChange(action.fromStatus, action.toStatus)}
                </p>
                <p className="break-words text-muted-foreground">
                  Motivo: {action.reasonCode ?? "non indicato"}
                  {action.reasonText ? ` - ${action.reasonText}` : ""}
                </p>
              </div>
              <div className="grid gap-1 md:min-w-44 md:text-right">
                <span className="text-muted-foreground">Operatore</span>
                <span className="font-medium break-words">
                  {action.actor?.displayName ?? "Sistema"}
                </span>
                {action.actor?.email ? (
                  <span className="break-words text-muted-foreground">
                    {action.actor.email}
                  </span>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-xs text-muted-foreground">
          Nessuna azione audit registrata per questo caso.
        </p>
      )}
    </section>
  )
}

function OperationalCaseDetails({
  item,
}: {
  item: ModerationQueueItem | ReportedListingQueueItem
}) {
  const reportDetails =
    "reports" in item
      ? [
          {
            label: "Prima segnalazione",
            value: formatDateTime(item.reports.firstReportedAt),
          },
          {
            label: "Ultima segnalazione",
            value: formatDateTime(item.reports.latestReportedAt),
          },
        ]
      : []
  const details = [
    {
      label: "ID caso",
      value: item.case.id,
    },
    {
      label: "ID annuncio",
      value: item.listing.id,
    },
    {
      label: "Stato ciclo",
      value: item.listing.lifecycleStatus,
    },
    {
      label: "Motivo apertura",
      value: item.case.reasonCode ?? "Non indicato",
    },
    {
      label: "Assegnato a",
      value: item.case.assignedToUserId ?? "Non assegnato",
    },
    {
      label: "Email proprietario",
      value: item.owner.email,
    },
    ...reportDetails,
    {
      label: "Ultimo aggiornamento",
      value: formatDateTime(item.listing.updatedAt),
    },
  ]

  return (
    <section
      aria-label="Dettaglio operativo caso"
      className="mt-4 rounded-md border border-brand-teal/15 bg-brand-teal-soft/70 p-3"
    >
      <div className="grid gap-1">
        <p className="text-sm font-medium">Dettaglio operativo caso</p>
        <p className="text-xs leading-5 text-muted-foreground">
          Dati tecnici per riconoscere il caso, verificare ownership e collegare
          audit o supporto interno.
        </p>
      </div>
      <div className="mt-3 grid gap-3 text-xs sm:grid-cols-2 lg:grid-cols-3">
        {details.map((detail) => (
          <InfoBlock
            key={detail.label}
            label={detail.label}
            value={detail.value}
          />
        ))}
      </div>
    </section>
  )
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium break-words">{value}</span>
    </div>
  )
}

function ModerationDecisionForm({ caseId }: { caseId: string }) {
  return (
    <form
      action={decideModerationCaseAction}
      className="mt-4 rounded-md border bg-card/80 p-3"
    >
      <input type="hidden" name="caseId" value={caseId} />
      <FieldGroup className="gap-3">
        <div className="grid gap-3 lg:grid-cols-[minmax(12rem,0.38fr)_minmax(0,1fr)]">
          <Field>
            <FieldLabel htmlFor={`reason-code-${caseId}`}>
              Motivo rapido
            </FieldLabel>
            <select
              id={`reason-code-${caseId}`}
              name="reasonCode"
              className={reasonSelectClassName}
              defaultValue=""
            >
              <option value="">Seleziona motivo</option>
              {moderationReasonOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>

          <Field>
            <FieldLabel htmlFor={`reason-text-${caseId}`}>
              Nota decisione
            </FieldLabel>
            <Textarea
              id={`reason-text-${caseId}`}
              name="reasonText"
              maxLength={2000}
              placeholder="Aggiungi una motivazione chiara per audit, proprietario e reporter."
              className="min-h-20 resize-y"
            />
            <FieldDescription>
              I template orientano la decisione: `policy_ok` per approvare,
              `policy_violation` o `incomplete_listing` per rifiutare,
              `risk_review` per sospendere.
            </FieldDescription>
          </Field>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button type="submit" name="decisionAction" value="approve">
            <CheckIcon aria-hidden="true" data-icon="inline-start" />
            Approva
          </Button>
          <Button
            type="submit"
            name="decisionAction"
            value="reject"
            variant="destructive"
          >
            <XCircleIcon aria-hidden="true" data-icon="inline-start" />
            Rifiuta
          </Button>
          <Button
            type="submit"
            name="decisionAction"
            value="suspend"
            variant="outline"
          >
            <CirclePauseIcon aria-hidden="true" data-icon="inline-start" />
            Sospendi
          </Button>
        </div>
      </FieldGroup>
    </form>
  )
}

function DecisionFeedback({
  decision,
  error,
}: {
  decision: string | null
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
          <CardDescription>
            Controlla che il caso sia ancora aperto e che la motivazione sia
            valida. Codice errore: {error}.
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
          La coda e stata aggiornata dopo la decisione:{" "}
          {formatDecisionAction(decision)}.
        </CardDescription>
      </CardHeader>
    </Card>
  )
}

function isApiStatus<T>(result: QueueResult<T>, status: number) {
  return !result.ok && result.status === status
}

function AccessDenied({ displayName }: { displayName: string }) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 px-4 py-10 sm:px-6 lg:px-8">
      <Empty className="border">
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

function readPageParam(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value
  const page = raw ? Number(raw) : 1

  return Number.isInteger(page) && page > 0 ? page : 1
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
    return "approvazione"
  }

  if (value === "reject") {
    return "rifiuto"
  }

  if (value === "suspend") {
    return "sospensione"
  }

  return "decisione"
}

function formatAuditAction(
  value: ModerationQueueItem["audit"]["actions"][number]["action"]
) {
  switch (value) {
    case "approved":
      return "approved"
    case "assigned":
      return "assigned"
    case "closed":
      return "closed"
    case "commented":
      return "commented"
    case "opened":
      return "opened"
    case "rejected":
      return "rejected"
    case "reported":
      return "reported"
    case "suspended":
      return "suspended"
  }

  return value
}

function formatAuditStatusChange(
  fromStatus: string | null,
  toStatus: string | null
) {
  if (!fromStatus && !toStatus) {
    return "Stato non registrato"
  }

  if (fromStatus === toStatus) {
    return `Stato invariato: ${fromStatus ?? "non indicato"}`
  }

  return `${fromStatus ?? "non indicato"} -> ${toStatus ?? "non indicato"}`
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
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
}
