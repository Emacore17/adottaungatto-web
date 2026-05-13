"use client"

import { useMemo, useState } from "react"
import {
  AlertTriangleIcon,
  CheckIcon,
  CirclePauseIcon,
  ImageIcon,
  XCircleIcon,
} from "lucide-react"

import { decideModerationBatchAction } from "@/app/(admin)/moderation/actions"
import { StorageImage } from "@/components/shared/storage-image"
import { getPublicObjectUrl } from "@/lib/api/assets"
import type {
  ModerationQueueItem,
  ReportedListingQueueItem,
} from "@/lib/api/moderation"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Checkbox } from "@workspace/ui/components/checkbox"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog"
import { Textarea } from "@workspace/ui/components/textarea"

type ModerationTableItem = ModerationQueueItem | ReportedListingQueueItem

type ModerationQueueTableProps = {
  items: ModerationTableItem[]
  nextPath: string
  queue: "pending" | "reported"
}

const batchReasonOptions = [
  { label: "Automatico", value: "auto" },
  { label: "Conforme alle policy", value: "policy_ok" },
  { label: "Contenuto non conforme", value: "policy_violation" },
  { label: "Informazioni insufficienti", value: "incomplete_listing" },
  { label: "Rischio da verificare", value: "risk_review" },
  { label: "Altro", value: "other" },
] as const

function ModerationQueueTable({
  items,
  nextPath,
  queue,
}: ModerationQueueTableProps) {
  const caseIds = useMemo(() => items.map((item) => item.case.id), [items])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const selectedCount = selectedIds.length
  const allSelected = items.length > 0 && selectedCount === items.length
  const someSelected = selectedCount > 0 && !allSelected

  function toggleAll(checked: boolean | "indeterminate") {
    setSelectedIds(checked === true ? caseIds : [])
  }

  function toggleCase(caseId: string, checked: boolean | "indeterminate") {
    setSelectedIds((current) => {
      if (checked === true) {
        return current.includes(caseId) ? current : [...current, caseId]
      }

      return current.filter((id) => id !== caseId)
    })
  }

  return (
    <section className="flex flex-col gap-3">
      <form
        action={decideModerationBatchAction}
        className="rounded-lg border bg-card p-3 shadow-sm"
      >
        <input type="hidden" name="nextPath" value={nextPath} />
        {selectedIds.map((caseId) => (
          <input key={caseId} type="hidden" name="caseId" value={caseId} />
        ))}

        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_12rem_minmax(14rem,0.8fr)_auto] lg:items-end">
          <div className="grid gap-1">
            <p className="text-sm font-medium">
              {selectedCount > 0
                ? `${selectedCount} casi selezionati`
                : "Seleziona casi dalla tabella"}
            </p>
            <p className="text-xs text-muted-foreground">
              Azioni batch per{" "}
              {queue === "pending" ? "annunci in revisione" : "segnalazioni"}.
            </p>
          </div>

          <label className="grid gap-1 text-sm">
            <span className="text-xs font-medium text-muted-foreground">
              Motivo
            </span>
            <select
              name="reasonCode"
              defaultValue="auto"
              className="h-9 rounded-md border border-input bg-background px-2.5 text-sm transition-shadow outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {batchReasonOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-1 text-sm">
            <span className="text-xs font-medium text-muted-foreground">
              Nota
            </span>
            <Textarea
              name="reasonText"
              maxLength={2000}
              placeholder="Nota breve per audit o casi non standard"
              className="min-h-9 resize-y py-2"
            />
          </label>

          <div className="flex flex-col gap-2 sm:flex-row lg:justify-end">
            <Button
              type="submit"
              name="decisionAction"
              value="approve"
              disabled={selectedCount === 0}
            >
              <CheckIcon aria-hidden="true" data-icon="inline-start" />
              Approva
            </Button>
            <Button
              type="submit"
              name="decisionAction"
              value="reject"
              variant="destructive"
              disabled={selectedCount === 0}
            >
              <XCircleIcon aria-hidden="true" data-icon="inline-start" />
              Rifiuta
            </Button>
            <Button
              type="submit"
              name="decisionAction"
              value="suspend"
              variant="outline"
              disabled={selectedCount === 0}
            >
              <CirclePauseIcon aria-hidden="true" data-icon="inline-start" />
              Sospendi
            </Button>
          </div>
        </div>
      </form>

      <div className="overflow-x-auto rounded-lg border bg-card shadow-sm">
        <table className="w-full min-w-[980px] border-collapse text-sm">
          <thead className="bg-muted/60 text-xs text-muted-foreground">
            <tr className="border-b">
              <th className="w-12 px-3 py-3 text-left">
                <Checkbox
                  aria-label="Seleziona tutti i casi"
                  checked={
                    allSelected ? true : someSelected ? "indeterminate" : false
                  }
                  onCheckedChange={toggleAll}
                />
              </th>
              <th className="px-3 py-3 text-left font-medium">Annuncio</th>
              <th className="px-3 py-3 text-left font-medium">Foto</th>
              <th className="px-3 py-3 text-left font-medium">Proprietario</th>
              <th className="px-3 py-3 text-left font-medium">Luogo</th>
              <th className="px-3 py-3 text-left font-medium">Aperto</th>
              <th className="px-3 py-3 text-right font-medium">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <ModerationQueueRow
                key={item.case.id}
                item={item}
                isSelected={selectedIds.includes(item.case.id)}
                nextPath={nextPath}
                onCheckedChange={(checked) => toggleCase(item.case.id, checked)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function ModerationQueueRow({
  isSelected,
  item,
  nextPath,
  onCheckedChange,
}: {
  isSelected: boolean
  item: ModerationTableItem
  nextPath: string
  onCheckedChange: (checked: boolean | "indeterminate") => void
}) {
  const coverUrl = getPublicObjectUrl(
    item.images.cover?.objectKeyLarge ?? item.images.cover?.objectKeyThumb
  )
  const reportCount = "reports" in item ? item.reports.count : null
  const latestReport = "reports" in item ? item.reports.latest : null

  return (
    <tr className="border-b last:border-b-0 hover:bg-muted/35">
      <td className="px-3 py-3 align-top">
        <Checkbox
          aria-label={`Seleziona ${item.listing.title}`}
          checked={isSelected}
          onCheckedChange={onCheckedChange}
        />
      </td>
      <td className="max-w-[24rem] px-3 py-3 align-top">
        <div className="flex flex-col gap-1.5">
          <div className="flex flex-wrap gap-1.5">
            <Badge className="bg-brand-teal-soft text-brand-teal-ink">
              {item.listing.moderationStatus}
            </Badge>
            {reportCount !== null ? (
              <Badge
                variant="outline"
                className="border-brand-coral/25 bg-brand-coral-soft text-brand-coral-strong"
              >
                <AlertTriangleIcon
                  aria-hidden="true"
                  data-icon="inline-start"
                />
                {reportCount}
              </Badge>
            ) : null}
          </div>
          <span className="font-medium">{item.listing.title}</span>
          <span className="line-clamp-2 text-xs leading-5 text-muted-foreground">
            {item.listing.description}
          </span>
          {latestReport?.description ? (
            <span className="line-clamp-1 text-xs text-brand-coral-strong">
              Report: {latestReport.description}
            </span>
          ) : null}
        </div>
      </td>
      <td className="px-3 py-3 align-top">
        <ImagePreviewButton
          coverUrl={coverUrl}
          readyCount={item.images.readyCount}
          title={item.listing.title}
        />
      </td>
      <td className="px-3 py-3 align-top">
        <div className="grid gap-1">
          <span className="font-medium">{item.owner.displayName}</span>
          <span className="text-xs text-muted-foreground">
            {item.owner.email}
          </span>
        </div>
      </td>
      <td className="px-3 py-3 align-top text-muted-foreground">
        {formatLocation(item.location)}
      </td>
      <td className="px-3 py-3 align-top text-muted-foreground">
        {formatDateTime(item.case.openedAt)}
      </td>
      <td className="px-3 py-3 align-top">
        <div className="flex justify-end gap-1.5">
          <QuickDecisionButton
            action="approve"
            caseId={item.case.id}
            nextPath={nextPath}
          />
          <QuickDecisionButton
            action="reject"
            caseId={item.case.id}
            nextPath={nextPath}
          />
        </div>
      </td>
    </tr>
  )
}

function ImagePreviewButton({
  coverUrl,
  readyCount,
  title,
}: {
  coverUrl: string | null
  readyCount: number
  title: string
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-auto gap-2 px-2 py-1.5"
        >
          <span className="relative flex size-12 overflow-hidden rounded-md bg-muted">
            {coverUrl ? (
              <StorageImage
                src={coverUrl}
                alt=""
                fill
                className="object-cover"
                sizes="3rem"
              />
            ) : (
              <span className="flex size-full items-center justify-center text-muted-foreground">
                <ImageIcon aria-hidden="true" />
              </span>
            )}
          </span>
          <span className="grid text-left">
            <span className="text-xs font-medium">{readyCount}</span>
            <span className="text-xs text-muted-foreground">foto</span>
          </span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-muted">
          {coverUrl ? (
            <StorageImage
              src={coverUrl}
              alt={title}
              fill
              className="object-contain"
              sizes="min(100vw, 48rem)"
            />
          ) : (
            <div className="flex size-full items-center justify-center text-muted-foreground">
              <ImageIcon aria-hidden="true" />
            </div>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Anteprima cover. Immagini pronte totali: {readyCount}.
        </p>
      </DialogContent>
    </Dialog>
  )
}

function QuickDecisionButton({
  action,
  caseId,
  nextPath,
}: {
  action: "approve" | "reject"
  caseId: string
  nextPath: string
}) {
  const isApprove = action === "approve"

  return (
    <form action={decideModerationBatchAction}>
      <input type="hidden" name="caseId" value={caseId} />
      <input type="hidden" name="nextPath" value={nextPath} />
      <input
        type="hidden"
        name="reasonCode"
        value={isApprove ? "policy_ok" : "policy_violation"}
      />
      <Button
        type="submit"
        name="decisionAction"
        value={action}
        variant={isApprove ? "outline" : "destructive"}
        size="icon-sm"
        aria-label={isApprove ? "Approva" : "Rifiuta"}
        title={isApprove ? "Approva" : "Rifiuta"}
      >
        {isApprove ? (
          <CheckIcon aria-hidden="true" />
        ) : (
          <XCircleIcon aria-hidden="true" />
        )}
      </Button>
    </form>
  )
}

function formatLocation(item: ModerationTableItem["location"]) {
  if (!item) {
    return "Non indicato"
  }

  return `${item.municipality.name}, ${item.province.name}`
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("it-IT", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value))
}

export { ModerationQueueTable }
