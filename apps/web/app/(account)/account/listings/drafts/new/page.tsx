import Link from "next/link"
import { ArrowLeftIcon } from "lucide-react"

import { requireAccountSession } from "@/app/(account)/account/_lib/session"
import { DraftActionMessage } from "@/app/(account)/account/listings/drafts/_components/draft-action-message"
import { DraftEditorForm } from "@/app/(account)/account/listings/drafts/_components/draft-editor-form"
import { listPublicCatBreeds } from "@/lib/api/listings"
import { getCurrentUserProfile } from "@/lib/api/users"
import { routes } from "@/lib/routes"
import { Button } from "@workspace/ui/components/button"

type NewDraftPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function NewDraftPage({
  searchParams,
}: NewDraftPageProps) {
  const params = await searchParams
  const { token } = await requireAccountSession(routes.accountDraftNew)
  const [breeds, profile] = await Promise.all([
    listPublicCatBreeds(),
    getCurrentUserProfile(token),
  ])

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="grid gap-2">
          <h1 className="text-3xl font-semibold tracking-normal">
            Inserisci annuncio
          </h1>
          <p className="text-sm text-muted-foreground">
            Dati, foto e invio a revisione in un solo percorso.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href={routes.accountDrafts}>
            <ArrowLeftIcon data-icon="inline-start" aria-hidden="true" />I miei
            annunci
          </Link>
        </Button>
      </div>

      <DraftActionMessage searchParams={params} />

      {!breeds.ok ? (
        <div
          role="status"
          className="rounded-md border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground"
        >
          Razze non disponibili: puoi salvare l&apos;annuncio senza razza.
        </div>
      ) : null}

      <DraftEditorForm
        breeds={breeds.ok ? breeds.data : []}
        profile={profile.ok ? profile.data : null}
      />
    </main>
  )
}
