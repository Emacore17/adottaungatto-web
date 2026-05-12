import Link from "next/link"
import { MailIcon, PhoneIcon, ShieldCheckIcon } from "lucide-react"

import { requireAccountSession } from "@/app/(account)/account/_lib/session"
import {
  listReceivedListingContactRequests,
  type ReceivedListingContactRequest,
} from "@/lib/api/contacts"
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
import { Separator } from "@workspace/ui/components/separator"

export default async function AccountContactsPage() {
  const { token } = await requireAccountSession(routes.accountContacts)
  const contacts = await listReceivedListingContactRequests(token, {
    page: 1,
    pageSize: 20,
  })

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div className="flex flex-col gap-3">
          <Badge variant="secondary" className="w-fit">
            Account
          </Badge>
          <div className="grid gap-2">
            <h1 className="text-3xl font-semibold tracking-normal">
              Contatti ricevuti
            </h1>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Richieste inviate dagli utenti per gli annunci che gestisci.
            </p>
          </div>
        </div>
        <Button asChild variant="outline">
          <Link href={routes.account}>Dashboard</Link>
        </Button>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Richieste di contatto</CardTitle>
          <CardDescription>
            Email e telefono del richiedente sono visibili solo quando ha dato
            consenso esplicito.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {contacts.ok ? (
            contacts.data.items.length > 0 ? (
              <div className="flex flex-col gap-4">
                {contacts.data.items.map((contact, index) => (
                  <ContactRequestItem key={contact.id} contact={contact}>
                    {index < contacts.data.items.length - 1 ? (
                      <Separator />
                    ) : null}
                  </ContactRequestItem>
                ))}
              </div>
            ) : (
              <Empty className="border">
                <EmptyHeader>
                  <EmptyTitle>Nessun contatto ricevuto</EmptyTitle>
                  <EmptyDescription>
                    Le richieste inviate dagli utenti appariranno qui.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            )
          ) : (
            <AccountContactsError message={contacts.message} />
          )}
        </CardContent>
      </Card>
    </main>
  )
}

function ContactRequestItem({
  children,
  contact,
}: {
  children?: React.ReactNode
  contact: ReceivedListingContactRequest
}) {
  const requesterEmail = contact.requester.email ?? "Email non condivisa"
  const requesterPhone = contact.requester.phoneE164 ?? "Telefono non condiviso"

  return (
    <article className="flex flex-col gap-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_16rem]">
        <div className="flex min-w-0 flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant={contact.status === "sent" ? "secondary" : "outline"}
            >
              {formatContactStatus(contact.status)}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {formatDateTime(contact.createdAt)}
            </span>
          </div>
          <div className="grid gap-1">
            <h2 className="text-lg font-semibold tracking-normal">
              {contact.listing.title}
            </h2>
            <p className="text-sm text-muted-foreground">
              Da {contact.requester.displayName}
            </p>
          </div>
          <p className="text-sm leading-6 text-muted-foreground">
            {contact.message}
          </p>
        </div>

        <aside className="flex flex-col gap-3 rounded-md border p-3 text-sm">
          <div className="flex items-start gap-2">
            <MailIcon aria-hidden="true" className="mt-0.5 shrink-0" />
            <div className="min-w-0">
              <p className="font-medium">Risposta email</p>
              <p className="truncate text-muted-foreground">{requesterEmail}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <PhoneIcon aria-hidden="true" className="mt-0.5 shrink-0" />
            <div className="min-w-0">
              <p className="font-medium">Telefono</p>
              <p className="truncate text-muted-foreground">{requesterPhone}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <ShieldCheckIcon aria-hidden="true" className="mt-0.5 shrink-0" />
            <div>
              <p className="font-medium">Consenso</p>
              <p className="text-muted-foreground">
                {formatSharedContacts(contact)}
              </p>
            </div>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href={routes.listing(contact.listing.id)}>Apri annuncio</Link>
          </Button>
        </aside>
      </div>
      {children}
    </article>
  )
}

function formatSharedContacts(contact: ReceivedListingContactRequest) {
  const sharedContacts = [
    contact.emailShared ? "email" : null,
    contact.phoneShared ? "telefono" : null,
  ].filter(Boolean)

  return sharedContacts.length > 0
    ? `Ha condiviso: ${sharedContacts.join(", ")}.`
    : "Nessun contatto diretto condiviso."
}

function AccountContactsError({ message }: { message: string }) {
  return (
    <Empty className="border">
      <EmptyHeader>
        <EmptyTitle>Contatti non disponibili</EmptyTitle>
        <EmptyDescription>{message}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  )
}

function formatContactStatus(status: ReceivedListingContactRequest["status"]) {
  if (status === "sent") {
    return "Inviata"
  }

  if (status === "failed") {
    return "Fallita"
  }

  return "In consegna"
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("it-IT", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
}
