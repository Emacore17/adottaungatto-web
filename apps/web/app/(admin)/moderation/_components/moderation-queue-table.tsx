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
import { formatModerationStatus } from "@/app/(admin)/moderation/_lib/moderation-labels"
import { StorageImage } from "@/components/shared/storage-image"
import { getPublicObjectUrl } from "@/lib/api/assets"
import type {
  ModerationQueueItem,
  ReportedListingQueueItem,
} from "@/lib/api/moderation"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@workspace/ui/components/card"
import { Checkbox } from "@workspace/ui/components/checkbox"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog"
import { Field, FieldGroup, FieldLabel } from "@workspace/ui/components/field"
import {
  NativeSelect,
  NativeSelectOption,
} from "@workspace/ui/components/native-select"
import { Textarea } from "@workspace/ui/components/textarea"
import { cn } from "@workspace/ui/lib/utils"

type ModerationTableItem = ModerationQueueItem | ReportedListingQueueItem

type ModerationPreviewImage = {
  id: string
  alt: string
  url: string
  isCover: boolean
}

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
        className="rounded-lg border bg-card p-3 shadow-sm sm:p-4"
      >
        <input type="hidden" name="nextPath" value={nextPath} />
        {selectedIds.map((caseId) => (
          <input key={caseId} type="hidden" name="caseId" value={caseId} />
        ))}

        <div className="grid gap-4 lg:grid-cols-[minmax(16rem,1fr)_minmax(28rem,1.35fr)_auto] lg:items-end">
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

          <FieldGroup className="gap-4 sm:grid sm:grid-cols-[minmax(12rem,15rem)_minmax(18rem,1fr)]">
            <Field className="gap-1.5">
              <FieldLabel htmlFor="moderation-batch-reason">Motivo</FieldLabel>
              <NativeSelect
                id="moderation-batch-reason"
                name="reasonCode"
                defaultValue="auto"
                className="w-full"
              >
                {batchReasonOptions.map((option) => (
                  <NativeSelectOption key={option.value} value={option.value}>
                    {option.label}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </Field>

            <Field className="gap-1.5">
              <FieldLabel htmlFor="moderation-batch-note">Nota</FieldLabel>
              <Textarea
                id="moderation-batch-note"
                name="reasonText"
                maxLength={2000}
                placeholder="Nota breve per audit o casi non standard"
                className="min-h-20 resize-y py-2 sm:min-h-9"
              />
            </Field>
          </FieldGroup>

          <div className="grid gap-2 sm:grid-cols-3 lg:flex lg:justify-end">
            <Button
              type="submit"
              name="decisionAction"
              value="approve"
              disabled={selectedCount === 0}
              className="w-full lg:w-auto"
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
              className="w-full lg:w-auto"
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
              className="w-full lg:w-auto"
            >
              <CirclePauseIcon aria-hidden="true" data-icon="inline-start" />
              Sospendi
            </Button>
          </div>
        </div>
      </form>

      <div className="grid gap-3 md:hidden">
        {items.map((item) => (
          <MobileModerationCard
            key={item.case.id}
            item={item}
            isSelected={selectedIds.includes(item.case.id)}
            nextPath={nextPath}
            onCheckedChange={(checked) => toggleCase(item.case.id, checked)}
          />
        ))}
      </div>

      <div className="hidden overflow-x-auto rounded-lg border bg-card shadow-sm md:block">
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
  const previewImages = createPreviewImages(item)
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
              {formatModerationStatus(item.listing.moderationStatus)}
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
          images={previewImages}
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
          <QuickDecisionButton
            action="suspend"
            caseId={item.case.id}
            nextPath={nextPath}
          />
        </div>
      </td>
    </tr>
  )
}

function MobileModerationCard({
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
  const previewImages = createPreviewImages(item)
  const reportCount = "reports" in item ? item.reports.count : null
  const latestReport = "reports" in item ? item.reports.latest : null

  return (
    <Card
      size="sm"
      className={cn("gap-3 py-4", isSelected ? "ring-primary/35" : undefined)}
    >
      <CardHeader className="px-4">
        <div className="flex items-start gap-3">
          <Checkbox
            aria-label={`Seleziona ${item.listing.title}`}
            checked={isSelected}
            className="mt-1 size-5"
            onCheckedChange={onCheckedChange}
          />
          <div className="grid min-w-0 flex-1 gap-1.5">
            <div className="flex flex-wrap gap-1.5">
              <Badge className="bg-brand-teal-soft text-brand-teal-ink">
                {formatModerationStatus(item.listing.moderationStatus)}
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
            <h2 className="line-clamp-2 text-sm font-semibold">
              {item.listing.title}
            </h2>
            <p className="line-clamp-2 text-xs leading-5 text-muted-foreground">
              {item.listing.description}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="grid gap-3 px-4">
        <ImagePreviewButton
          images={previewImages}
          layout="wide"
          readyCount={item.images.readyCount}
          title={item.listing.title}
        />

        <div className="grid gap-2 rounded-lg border bg-muted/25 p-3 text-xs sm:grid-cols-2">
          <InfoBlock
            label="Proprietario"
            value={item.owner.displayName}
            detail={item.owner.email}
          />
          <InfoBlock label="Luogo" value={formatLocation(item.location)} />
          <InfoBlock
            label="Aperto"
            value={formatDateTime(item.case.openedAt)}
          />
          {latestReport?.description ? (
            <InfoBlock
              label="Report"
              value={latestReport.description}
              tone="danger"
            />
          ) : null}
        </div>
      </CardContent>

      <CardFooter className="grid grid-cols-2 gap-2 border-t px-4 pt-3">
        <QuickDecisionButton
          action="approve"
          caseId={item.case.id}
          className="w-full"
          nextPath={nextPath}
          showLabel
        />
        <QuickDecisionButton
          action="reject"
          caseId={item.case.id}
          className="w-full"
          nextPath={nextPath}
          showLabel
        />
        <QuickDecisionButton
          action="suspend"
          caseId={item.case.id}
          className="w-full"
          formClassName="col-span-2"
          nextPath={nextPath}
          showLabel
        />
      </CardFooter>
    </Card>
  )
}

function InfoBlock({
  detail,
  label,
  tone = "default",
  value,
}: {
  detail?: string
  label: string
  tone?: "danger" | "default"
  value: string
}) {
  return (
    <div className="grid min-w-0 gap-0.5">
      <span className="font-medium text-muted-foreground">{label}</span>
      <span
        className={cn(
          "truncate font-medium",
          tone === "danger" ? "text-brand-coral-strong" : undefined
        )}
      >
        {value}
      </span>
      {detail ? (
        <span className="truncate text-muted-foreground">{detail}</span>
      ) : null}
    </div>
  )
}

function ImagePreviewButton({
  images,
  layout = "compact",
  readyCount,
  title,
}: {
  images: ModerationPreviewImage[]
  layout?: "compact" | "wide"
  readyCount: number
  title: string
}) {
  const firstImage = images[0]
  const isWide = layout === "wide"
  const visibleCount = images.length

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size={isWide ? "default" : "sm"}
          className={cn(
            "h-auto",
            isWide
              ? "w-full justify-start gap-3 p-2 text-left"
              : "gap-2 px-2 py-1.5"
          )}
        >
          <span
            className={cn(
              "relative flex shrink-0 overflow-hidden rounded-md bg-muted",
              isWide ? "h-24 w-28" : "size-12"
            )}
          >
            {firstImage ? (
              <StorageImage
                src={firstImage.url}
                alt=""
                fill
                className="object-cover"
                sizes={isWide ? "7rem" : "3rem"}
              />
            ) : (
              <span className="flex size-full items-center justify-center text-muted-foreground">
                <ImageIcon aria-hidden="true" />
              </span>
            )}
          </span>
          <span className="grid min-w-0 gap-0.5 text-left">
            <span className={cn("font-medium", isWide ? "text-sm" : "text-xs")}>
              {isWide ? `${readyCount} foto` : readyCount}
            </span>
            <span className="text-xs text-muted-foreground">
              {isWide ? "Apri anteprima immagini" : "foto"}
            </span>
          </span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {visibleCount > 0 ? (
          <div className="grid max-h-[70vh] gap-3 overflow-y-auto pr-1 sm:grid-cols-2 lg:grid-cols-3">
            {images.map((image, index) => (
              <figure key={image.id} className="grid gap-1.5">
                <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-muted">
                  <StorageImage
                    src={image.url}
                    alt={image.alt}
                    fill
                    className="object-contain"
                    sizes="(min-width: 1024px) 16rem, (min-width: 640px) 50vw, 100vw"
                  />
                </div>
                <figcaption className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span>Foto {index + 1}</span>
                  {image.isCover ? (
                    <Badge className="bg-brand-teal-soft text-brand-teal-ink">
                      Cover
                    </Badge>
                  ) : null}
                </figcaption>
              </figure>
            ))}
          </div>
        ) : (
          <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-muted">
            <div className="flex size-full items-center justify-center text-muted-foreground">
              <ImageIcon aria-hidden="true" />
            </div>
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          {visibleCount > 0
            ? `Mostrate ${visibleCount} di ${readyCount} immagini pronte.`
            : `Nessuna immagine pronta su ${readyCount}.`}
        </p>
      </DialogContent>
    </Dialog>
  )
}

function createPreviewImages(
  item: ModerationTableItem
): ModerationPreviewImage[] {
  const images = item.images.preview
    .map((image, index) => {
      const url = getPublicObjectUrl(
        image.objectKeyLarge ?? image.objectKeyThumb
      )

      if (!url) {
        return null
      }

      return {
        id: image.id,
        alt: `${item.listing.title}, foto ${index + 1}`,
        url,
        isCover: image.isCover,
      }
    })
    .filter((image): image is ModerationPreviewImage => image !== null)

  if (images.length > 0 || !item.images.cover) {
    return images
  }

  const fallbackUrl = getPublicObjectUrl(
    item.images.cover.objectKeyLarge ?? item.images.cover.objectKeyThumb
  )

  return fallbackUrl
    ? [
        {
          id: item.images.cover.id,
          alt: `${item.listing.title}, cover`,
          url: fallbackUrl,
          isCover: true,
        },
      ]
    : []
}

function QuickDecisionButton({
  action,
  caseId,
  className,
  formClassName,
  nextPath,
  showLabel = false,
}: {
  action: "approve" | "reject" | "suspend"
  caseId: string
  className?: string
  formClassName?: string
  nextPath: string
  showLabel?: boolean
}) {
  const isApprove = action === "approve"
  const isReject = action === "reject"
  const label = getDecisionLabel(action)

  return (
    <form action={decideModerationBatchAction} className={formClassName}>
      <input type="hidden" name="caseId" value={caseId} />
      <input type="hidden" name="nextPath" value={nextPath} />
      <input
        type="hidden"
        name="reasonCode"
        value={getDecisionReasonCode(action)}
      />
      <Button
        type="submit"
        name="decisionAction"
        value={action}
        variant={isReject ? "destructive" : "outline"}
        size={showLabel ? "sm" : "icon-sm"}
        aria-label={label}
        title={label}
        className={className}
      >
        {isApprove ? (
          <CheckIcon
            aria-hidden="true"
            data-icon={showLabel ? "inline-start" : undefined}
          />
        ) : isReject ? (
          <XCircleIcon
            aria-hidden="true"
            data-icon={showLabel ? "inline-start" : undefined}
          />
        ) : (
          <CirclePauseIcon
            aria-hidden="true"
            data-icon={showLabel ? "inline-start" : undefined}
          />
        )}
        {showLabel ? label : null}
      </Button>
    </form>
  )
}

function getDecisionLabel(action: "approve" | "reject" | "suspend") {
  if (action === "approve") {
    return "Approva"
  }

  if (action === "reject") {
    return "Rifiuta"
  }

  return "Sospendi"
}

function getDecisionReasonCode(action: "approve" | "reject" | "suspend") {
  if (action === "approve") {
    return "policy_ok"
  }

  if (action === "reject") {
    return "policy_violation"
  }

  return "risk_review"
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
