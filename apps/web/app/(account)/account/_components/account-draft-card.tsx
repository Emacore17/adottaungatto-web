import Link from "next/link"
import {
  CalendarClockIcon,
  MapPinIcon,
  PencilIcon,
  Trash2Icon,
} from "lucide-react"

import { deleteDraftAction } from "@/app/(account)/account/actions"
import type { ListingDraft } from "@/lib/api/account"
import { routes } from "@/lib/routes"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent } from "@workspace/ui/components/card"

type AccountDraftCardProps = {
  draft: ListingDraft
  returnPath?: string
}

function AccountDraftCard({ draft, returnPath }: AccountDraftCardProps) {
  const location = draft.location
    ? `${draft.location.municipality.name}, ${draft.location.province.name}`
    : "Luogo non indicato"
  const isPendingReview = draft.moderationStatus === "pending_review"

  return (
    <Card className="ring-brand-amber/20 hover:ring-brand-amber/40">
      <CardContent className="flex flex-col gap-4 p-4">
        <div className="grid gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="bg-brand-amber-soft text-brand-teal-ink">
              {isPendingReview ? "In revisione" : "In lavorazione"}
            </Badge>
            <Badge variant="outline">{draft.sex}</Badge>
            {draft.breed ? (
              <Badge variant="outline">{draft.breed.name}</Badge>
            ) : null}
          </div>
          <h2 className="text-lg font-semibold tracking-normal">
            {draft.title}
          </h2>
          <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">
            {draft.description}
          </p>
        </div>

        <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
          <p className="flex min-w-0 items-center gap-1.5">
            <MapPinIcon aria-hidden="true" className="size-4 shrink-0" />
            <span className="truncate">{location}</span>
          </p>
          <p className="flex items-center gap-1.5">
            <CalendarClockIcon aria-hidden="true" className="size-4 shrink-0" />
            Aggiornata {formatDate(draft.updatedAt)}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button asChild variant="outline" size="sm">
            <Link href={routes.accountDraft(draft.id)}>
              <PencilIcon data-icon="inline-start" aria-hidden="true" />
              {isPendingReview ? "Rivedi" : "Modifica"}
            </Link>
          </Button>
          {returnPath && !isPendingReview ? (
            <form action={deleteDraftAction}>
              <input type="hidden" name="draftId" value={draft.id} />
              <input type="hidden" name="nextPath" value={returnPath} />
              <Button type="submit" variant="destructive" size="sm">
                <Trash2Icon data-icon="inline-start" aria-hidden="true" />
                Elimina annuncio
              </Button>
            </form>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("it-IT", {
    dateStyle: "medium",
  }).format(new Date(value))
}

export { AccountDraftCard }
