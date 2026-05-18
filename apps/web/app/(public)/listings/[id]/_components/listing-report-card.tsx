import Link from "next/link"
import { FlagIcon } from "lucide-react"

import { reportListingAction } from "@/app/(public)/listings/[id]/actions"
import { routes } from "@/lib/routes"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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

type ListingReportCardProps = {
  isAuthenticated: boolean
  isOwner: boolean
  listingId: string
  reportStatus: string | null
}

const reportReasonOptions = [
  { label: "Non pertinente", value: "not_relevant" },
  { label: "Immagini inappropriate", value: "inappropriate_images" },
  { label: "Sospetta truffa", value: "suspected_scam" },
  { label: "Informazioni false", value: "false_information" },
  { label: "Abuso", value: "abuse" },
  { label: "Altro", value: "other" },
] as const

export function ListingReportCard({
  isAuthenticated,
  isOwner,
  listingId,
  reportStatus,
}: ListingReportCardProps) {
  return (
    <Card id="report-listing" className="gap-4">
      <CardHeader className="gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant="outline"
            className="border-brand-coral/25 bg-brand-coral-soft text-brand-coral-strong"
          >
            <FlagIcon aria-hidden="true" data-icon="inline-start" />
            Segnalazione
          </Badge>
          {reportStatus ? (
            <Badge variant="secondary">{formatReportStatus(reportStatus)}</Badge>
          ) : null}
        </div>
        <CardTitle className="text-base">Segnala annuncio</CardTitle>
        <CardDescription>
          Usa questa azione per contenuti sospetti o non conformi.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="font-mono text-[11px] text-muted-foreground">
          Annuncio {listingId}
        </p>
      </CardContent>
      <CardFooter>
        {isOwner ? (
          <Button type="button" variant="outline" disabled className="w-full">
            Non disponibile sul tuo annuncio
          </Button>
        ) : isAuthenticated ? (
          <ReportDialog listingId={listingId} />
        ) : (
          <Button asChild variant="outline" className="w-full">
            <Link href={routes.login(`${routes.listing(listingId)}#report-listing`)}>
              Accedi per segnalare
            </Link>
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}

function ReportDialog({ listingId }: { listingId: string }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full">
          <FlagIcon aria-hidden="true" data-icon="inline-start" />
          Segnala
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Segnala annuncio</DialogTitle>
          <DialogDescription>
            La segnalazione apre un caso per il team di moderazione.
          </DialogDescription>
        </DialogHeader>

        <form action={reportListingAction} className="grid gap-4">
          <input type="hidden" name="listingId" value={listingId} />
          <FieldGroup>
            <Field className="gap-1.5">
              <FieldLabel htmlFor={`report-reason-${listingId}`}>
                Motivo
              </FieldLabel>
              <NativeSelect
                id={`report-reason-${listingId}`}
                name="reasonCode"
                required
              >
                {reportReasonOptions.map((option) => (
                  <NativeSelectOption key={option.value} value={option.value}>
                    {option.label}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </Field>

            <Field className="gap-1.5">
              <FieldLabel htmlFor={`report-description-${listingId}`}>
                Dettagli
              </FieldLabel>
              <Textarea
                id={`report-description-${listingId}`}
                name="description"
                maxLength={2000}
                placeholder="Elementi utili alla verifica"
                className="min-h-28 resize-y"
              />
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button type="submit">Invia segnalazione</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function formatReportStatus(value: string) {
  if (value === "sent") {
    return "Inviata"
  }

  if (value === "already_sent") {
    return "Gia inviata"
  }

  if (value === "invalid") {
    return "Dati non validi"
  }

  if (value === "own_listing") {
    return "Proprietario"
  }

  if (value === "rate_limited") {
    return "Troppi invii"
  }

  if (value === "unavailable") {
    return "Non disponibile"
  }

  return "Errore"
}
