import Link from "next/link"
import { PlusIcon } from "lucide-react"

import { AccountDraftCard } from "@/app/(account)/account/_components/account-draft-card"
import { requireAccountSession } from "@/app/(account)/account/_lib/session"
import { DraftActionMessage } from "@/app/(account)/account/listings/drafts/_components/draft-action-message"
import { listAccountDrafts } from "@/lib/api/account"
import { routes } from "@/lib/routes"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@workspace/ui/components/empty"

type DraftListingsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

const pageSize = 12

export default async function DraftListingsPage({
  searchParams,
}: DraftListingsPageProps) {
  const params = await searchParams
  const page = readPageParam(params.page)
  const currentPath =
    page > 1 ? `${routes.accountDrafts}?page=${page}` : routes.accountDrafts
  const { token } = await requireAccountSession(routes.accountDrafts)
  const drafts = await listAccountDrafts(token, { page, pageSize })

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="grid gap-2">
          <h1 className="text-3xl font-semibold tracking-normal">
            Bozze annunci
          </h1>
          <p className="text-sm text-muted-foreground">
            Annunci salvati ma non ancora pubblicati.
          </p>
        </div>
        <Button asChild>
          <Link href={routes.accountDraftNew}>
            <PlusIcon data-icon="inline-start" aria-hidden="true" />
            Nuova bozza
          </Link>
        </Button>
      </div>

      <DraftActionMessage searchParams={params} />

      {drafts.ok ? (
        drafts.data.items.length > 0 ? (
          <>
            <div className="grid gap-3">
              {drafts.data.items.map((draft) => (
                <AccountDraftCard
                  key={draft.id}
                  draft={draft}
                  returnPath={currentPath}
                />
              ))}
            </div>
            <PaginationFooter
              page={drafts.data.meta.page}
              totalPages={drafts.data.meta.totalPages}
              route={routes.accountDrafts}
            />
          </>
        ) : (
          <Empty className="border">
            <EmptyHeader>
              <EmptyTitle>Nessuna bozza</EmptyTitle>
              <EmptyDescription>
                Le bozze salvate saranno disponibili in questa area.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button asChild>
                <Link href={routes.accountDraftNew}>Crea bozza</Link>
              </Button>
            </EmptyContent>
          </Empty>
        )
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Bozze non disponibili</CardTitle>
            <CardDescription>{drafts.message}</CardDescription>
          </CardHeader>
        </Card>
      )}
    </main>
  )
}

function PaginationFooter({
  page,
  route,
  totalPages,
}: {
  page: number
  route: string
  totalPages: number
}) {
  const safeTotalPages = Math.max(totalPages, 1)

  return (
    <div className="flex flex-col items-center justify-between gap-3 text-sm text-muted-foreground sm:flex-row">
      <span>
        Pagina {page} di {safeTotalPages}
      </span>
      <div className="flex gap-2">
        <Button asChild variant="outline" size="sm">
          <Link
            aria-disabled={page <= 1}
            href={page > 1 ? `${route}?page=${page - 1}` : route}
          >
            Precedente
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link
            aria-disabled={page >= safeTotalPages}
            href={page < safeTotalPages ? `${route}?page=${page + 1}` : route}
          >
            Successiva
          </Link>
        </Button>
      </div>
    </div>
  )
}

function readPageParam(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value
  const page = raw ? Number(raw) : 1

  return Number.isInteger(page) && page > 0 ? page : 1
}
