import Link from "next/link"
import { CheckCircle2Icon, InboxIcon, ListChecksIcon } from "lucide-react"

import { requireAccountSession } from "@/app/(account)/account/_lib/session"
import { routes } from "@/lib/routes"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"

export default async function ListingSubmittedPage() {
  await requireAccountSession(routes.accountListingSubmitted)

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6 lg:px-8">
      <Card>
        <CardHeader className="gap-4">
          <div className="flex size-12 items-center justify-center rounded-md bg-primary/10 text-primary">
            <CheckCircle2Icon aria-hidden="true" className="size-6" />
          </div>
          <div className="grid gap-2">
            <CardTitle className="text-2xl">Annuncio inserito</CardTitle>
            <CardDescription>
              Il tuo annuncio e stato inviato in revisione. Attendi la verifica:
              riceverai una notifica quando sara pubblicato o se servono
              modifiche.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row">
          <Button asChild>
            <Link href={routes.accountDrafts}>
              <ListChecksIcon data-icon="inline-start" aria-hidden="true" />
              I miei annunci
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={routes.accountNotifications}>
              <InboxIcon data-icon="inline-start" aria-hidden="true" />
              Notifiche
            </Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  )
}
