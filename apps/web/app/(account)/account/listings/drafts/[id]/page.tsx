import Link from "next/link"
import { ArrowLeftIcon } from "lucide-react"
import { listingDraftIdParamSchema } from "@workspace/validation/listings"

import { requireAccountSession } from "@/app/(account)/account/_lib/session"
import { DraftActionMessage } from "@/app/(account)/account/listings/drafts/_components/draft-action-message"
import { DraftEditorForm } from "@/app/(account)/account/listings/drafts/_components/draft-editor-form"
import { DraftImagePanel } from "@/app/(account)/account/listings/drafts/_components/draft-image-panel"
import { DraftSubmitPanel } from "@/app/(account)/account/listings/drafts/_components/draft-submit-panel"
import { getAccountDraft, listAccountDraftImages } from "@/lib/api/account"
import { listPublicCatBreeds } from "@/lib/api/listings"
import { routes } from "@/lib/routes"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"

type EditDraftPageProps = {
  params: Promise<{
    id: string
  }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function EditDraftPage({
  params,
  searchParams,
}: EditDraftPageProps) {
  const [{ id }, query] = await Promise.all([params, searchParams])
  const currentPath = routes.accountDraft(id)
  const { token } = await requireAccountSession(currentPath)
  const parsed = listingDraftIdParamSchema.safeParse({ id })

  if (!parsed.success) {
    return <DraftUnavailable message="Identificativo annuncio non valido." />
  }

  const [draft, breeds, images] = await Promise.all([
    getAccountDraft(token, parsed.data.id),
    listPublicCatBreeds(),
    listAccountDraftImages(token, parsed.data.id),
  ])

  if (!draft.ok) {
    return <DraftUnavailable message={draft.message} />
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="grid gap-2">
          <h1 className="text-3xl font-semibold tracking-normal">
            {draft.data.title}
          </h1>
          <p className="text-sm text-muted-foreground">
            Completa dati e foto. Quando una foto risulta Pronta puoi inviare
            l&apos;annuncio in revisione.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href={routes.accountDrafts}>
            <ArrowLeftIcon data-icon="inline-start" aria-hidden="true" />
            I miei annunci
          </Link>
        </Button>
      </div>

      <DraftActionMessage searchParams={query} />

      {!breeds.ok ? (
        <div
          role="status"
          className="rounded-md border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground"
        >
          Razze non disponibili: puoi salvare l&apos;annuncio con la razza
          corrente.
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <DraftEditorForm
          breeds={
            breeds.ok ? breeds.data : draft.data.breed ? [draft.data.breed] : []
          }
          draft={draft.data}
        />
        <aside className="grid h-fit gap-6">
          <DraftImagePanel
            draftId={draft.data.id}
            images={images.ok ? images.data : null}
            nextPath={currentPath}
          />
          <DraftSubmitPanel draftId={draft.data.id} nextPath={currentPath} />
        </aside>
      </div>
    </main>
  )
}

function DraftUnavailable({ message }: { message: string }) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <Button asChild variant="outline" className="w-fit">
        <Link href={routes.accountDrafts}>
          <ArrowLeftIcon data-icon="inline-start" aria-hidden="true" />
          I miei annunci
        </Link>
      </Button>
      <Card>
        <CardHeader>
          <CardTitle>Annuncio non disponibile</CardTitle>
          <CardDescription>{message}</CardDescription>
        </CardHeader>
      </Card>
    </main>
  )
}
