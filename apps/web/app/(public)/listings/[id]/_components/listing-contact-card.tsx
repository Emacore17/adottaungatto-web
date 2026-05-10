import Link from "next/link"
import { LogInIcon, MailIcon } from "lucide-react"

import { contactListingOwnerAction } from "@/app/(public)/listings/[id]/actions"
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
import { Checkbox } from "@workspace/ui/components/checkbox"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@workspace/ui/components/field"
import { Textarea } from "@workspace/ui/components/textarea"

type ContactStatus = "error" | "invalid" | "sent" | "unavailable" | null

type ListingContactCardProps = {
  contactStatus: ContactStatus
  isAuthenticated: boolean
  isEnabled: boolean
  listingId: string
}

function ListingContactCard({
  contactStatus,
  isAuthenticated,
  isEnabled,
  listingId,
}: ListingContactCardProps) {
  const messageInvalid = contactStatus === "invalid"

  return (
    <Card id="contact-owner">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle>Contatta il proprietario</CardTitle>
          <Badge variant="secondary">Privacy</Badge>
        </div>
        <CardDescription>
          Il messaggio viene inoltrato via email senza mostrare l&apos;indirizzo
          del proprietario.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <ContactFeedback status={contactStatus} />
        {!isEnabled ? (
          <p className="rounded-md border bg-muted px-3 py-2 text-sm text-muted-foreground">
            Il proprietario non riceve richieste per questo annuncio.
          </p>
        ) : isAuthenticated ? (
          <form action={contactListingOwnerAction} className="flex flex-col gap-4">
            <input type="hidden" name="listingId" value={listingId} />
            <FieldGroup>
              <Field data-invalid={messageInvalid ? true : undefined}>
                <FieldLabel htmlFor="contact-message">Messaggio</FieldLabel>
                <Textarea
                  id="contact-message"
                  name="message"
                  minLength={20}
                  maxLength={2000}
                  required
                  aria-invalid={messageInvalid}
                  placeholder="Presentati e indica perche vuoi conoscere questo gatto."
                />
                <FieldDescription>
                  Minimo 20 caratteri. Non inserire dati sensibili non necessari.
                </FieldDescription>
              </Field>
              <Field
                orientation="horizontal"
                data-invalid={messageInvalid ? true : undefined}
              >
                <Checkbox
                  id="contact-share-email"
                  name="shareEmail"
                  value="true"
                  required
                  aria-invalid={messageInvalid}
                />
                <FieldContent>
                  <FieldLabel htmlFor="contact-share-email">
                    Consento la risposta via email
                  </FieldLabel>
                  <FieldDescription>
                    Il tuo indirizzo email sara usato come risposta al messaggio
                    inviato al proprietario.
                  </FieldDescription>
                </FieldContent>
              </Field>
            </FieldGroup>
            <Button type="submit" className="w-fit">
              <MailIcon data-icon="inline-start" aria-hidden="true" />
              Invia richiesta
            </Button>
          </form>
        ) : (
          <Button asChild className="w-fit">
            <Link href={routes.login(routes.listing(listingId))}>
              <LogInIcon data-icon="inline-start" aria-hidden="true" />
              Accedi per contattare
            </Link>
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

function ContactFeedback({ status }: { status: ContactStatus }) {
  if (!status) {
    return null
  }

  const message =
    status === "sent"
      ? "Richiesta inviata. Il proprietario potra rispondere via email."
      : status === "invalid"
        ? "Controlla il messaggio e conferma il consenso email."
        : status === "unavailable"
          ? "Questo annuncio non e' piu disponibile per il contatto."
          : "Non e' stato possibile inviare la richiesta. Riprova piu tardi."

  return (
    <p className="rounded-md border bg-muted px-3 py-2 text-sm text-muted-foreground">
      {message}
    </p>
  )
}

export { ListingContactCard, type ContactStatus }
