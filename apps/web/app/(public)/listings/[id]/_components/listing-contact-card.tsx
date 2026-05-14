import Link from "next/link"
import { LogInIcon, MailIcon, PhoneCallIcon } from "lucide-react"

import { contactListingOwnerAction } from "@/app/(public)/listings/[id]/actions"
import { routes } from "@/lib/routes"
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
  hasShareablePhone: boolean
  isAuthenticated: boolean
  isEnabled: boolean
  listingId: string
  publicPhoneE164: string | null
}

function ListingContactCard({
  contactStatus,
  hasShareablePhone,
  isAuthenticated,
  isEnabled,
  listingId,
  publicPhoneE164,
}: ListingContactCardProps) {
  const messageInvalid = contactStatus === "invalid"

  return (
    <Card
      id="contact-owner"
      className="border-brand-teal/20 ring-brand-teal/20"
    >
      <CardHeader>
        <CardTitle>Scrivi un messaggio</CardTitle>
        <CardDescription>
          Contatta chi ha pubblicato l&apos;annuncio.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {publicPhoneE164 ? (
          <Button asChild variant="outline" className="w-full justify-start">
            <a href={`tel:${publicPhoneE164}`}>
              <PhoneCallIcon data-icon="inline-start" aria-hidden="true" />
              {publicPhoneE164}
            </a>
          </Button>
        ) : null}
        <ContactFeedback status={contactStatus} />
        {!isEnabled ? (
          <p className="rounded-md border border-brand-amber/30 bg-brand-amber-soft px-3 py-2 text-sm text-brand-teal-ink">
            Il proprietario non riceve richieste per questo annuncio.
          </p>
        ) : isAuthenticated ? (
          <form
            action={contactListingOwnerAction}
            className="flex flex-col gap-4"
          >
            <input type="hidden" name="listingId" value={listingId} />
            <FieldGroup>
              <Field data-invalid={messageInvalid ? true : undefined}>
                <FieldLabel htmlFor="contact-message">
                  Il tuo messaggio
                </FieldLabel>
                <Textarea
                  id="contact-message"
                  name="message"
                  minLength={20}
                  maxLength={2000}
                  required
                  aria-invalid={messageInvalid}
                  className="min-h-36"
                  placeholder="Ciao, vorrei conoscere questo gattino."
                />
                <FieldDescription>Minimo 20 caratteri.</FieldDescription>
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
                    Necessario per ricevere risposta.
                  </FieldDescription>
                </FieldContent>
              </Field>
              <Field orientation="horizontal">
                <Checkbox
                  id="contact-share-phone"
                  name="sharePhone"
                  value="true"
                  disabled={!hasShareablePhone}
                />
                <FieldContent>
                  <FieldLabel htmlFor="contact-share-phone">
                    Condividi anche il telefono
                  </FieldLabel>
                  <FieldDescription>
                    {hasShareablePhone ? (
                      "Facoltativo."
                    ) : (
                      <>
                        Aggiungi un numero nelle{" "}
                        <Link
                          href={routes.accountSettings}
                          className="underline underline-offset-4"
                        >
                          impostazioni account
                        </Link>{" "}
                        per abilitarlo.
                      </>
                    )}
                  </FieldDescription>
                </FieldContent>
              </Field>
            </FieldGroup>
            <Button type="submit" className="w-full">
              <MailIcon data-icon="inline-start" aria-hidden="true" />
              Invia messaggio
            </Button>
          </form>
        ) : (
          <Button asChild className="w-full">
            <Link href={routes.login(routes.listing(listingId))}>
              <LogInIcon data-icon="inline-start" aria-hidden="true" />
              Accedi per scrivere
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
      ? "Messaggio inviato."
      : status === "invalid"
        ? "Controlla il messaggio e conferma il consenso email."
        : status === "unavailable"
          ? "Questo annuncio non e' piu disponibile per il contatto."
          : "Non e' stato possibile inviare la richiesta. Riprova piu tardi."

  return (
    <p className="rounded-md border border-brand-teal/20 bg-brand-teal-soft px-3 py-2 text-sm text-brand-teal-ink">
      {message}
    </p>
  )
}

export { ListingContactCard, type ContactStatus }
