import Image from "next/image"
import Link from "next/link"
import { redirect } from "next/navigation"
import {
  AlertTriangleIcon,
  CheckIcon,
  CirclePauseIcon,
  FileTextIcon,
  ImageIcon,
  ShieldAlertIcon,
  XCircleIcon,
} from "lucide-react"

import { decideModerationCaseAction } from "@/app/(admin)/moderation/actions"
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

const queuePageSize = 8

const reasonSelectClassName =
  "h-10 w-full rounded-md border border-input bg-background px-2.5 text-sm text-foreground shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"

const moderationReasonOptions = [
  { label: "Conforme alle policy", value: "policy_ok" },
  { label: "Contenuto non conforme", value: "policy_violation" },
  { label: "Informazioni insufficienti", value: "incomplete_listing" },
  { label: "Rischio da verificare", value: "risk_review" },
  { label: "Altro motivo", value: "other" },
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
        <Badge variant="secondary" className="w-fit">
          Area interna
        </Badge>
        <div className="grid gap-2">
          <h1 className="text-3xl font-semibold tracking-normal">
            Moderazione
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

      <QueueSection
        title="Annunci in attesa"
        description="Bozze inviate a moderazione prima della pubblicazione."
        emptyTitle="Nessun annuncio in attesa"
        emptyDescription="La coda pending_review e' vuota."
        result={pendingQueue}
        renderItem={(item) => <ModerationItemCard item={item} />}
      />

      <QueueSection
        title="Annunci segnalati"
        description="Casi aperti dopo report su annunci pubblicati o sospetti."
        emptyTitle="Nessuna segnalazione aperta"
        emptyDescription="La coda delle segnalazioni e' vuota."
        result={reportedQueue}
        renderItem={(item) => <ModerationItemCard item={item} />}
      />
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

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-4">
        <div className="grid gap-1">
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
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
            <Image
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
                <Badge variant="secondary">{item.listing.moderationStatus}</Badge>
                {reportCount !== null ? (
                  <Badge variant="outline">{reportCount} report</Badge>
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

          {latestReport ? (
            <div className="mt-4 rounded-md border bg-muted/40 p-3 text-sm">
              <div className="flex items-start gap-2">
                <AlertTriangleIcon
                  aria-hidden="true"
                  className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                />
                <div className="grid gap-1">
                  <p className="font-medium">
                    Ultima segnalazione: {latestReport.reasonCode}
                  </p>
                  {latestReport.description ? (
                    <p className="line-clamp-2 text-muted-foreground">
                      {latestReport.description}
                    </p>
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

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  )
}

function ModerationDecisionForm({ caseId }: { caseId: string }) {
  return (
    <form
      action={decideModerationCaseAction}
      className="mt-4 rounded-md border bg-background/70 p-3"
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
              Serve almeno un motivo rapido o una nota.
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
      <Card className="border-destructive/35">
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
    <Card className="border-primary/25">
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

function formatLocation(
  location: ModerationQueueItem["location"] | ReportedListingQueueItem["location"]
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
