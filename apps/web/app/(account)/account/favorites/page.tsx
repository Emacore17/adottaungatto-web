import Link from "next/link"

import { AccountFavoriteCard } from "@/app/(account)/account/_components/account-favorite-card"
import { requireAccountSession } from "@/app/(account)/account/_lib/session"
import { listAccountFavorites } from "@/lib/api/account"
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

type FavoritesPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

const pageSize = 12

export default async function FavoritesPage({
  searchParams,
}: FavoritesPageProps) {
  const params = await searchParams
  const page = readPageParam(params.page)
  const currentPath =
    page > 1
      ? `${routes.accountFavorites}?page=${page}`
      : routes.accountFavorites
  const { token } = await requireAccountSession(routes.accountFavorites)
  const favorites = await listAccountFavorites(token, { page, pageSize })

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <div className="grid gap-2">
        <h1 className="text-3xl font-semibold tracking-normal">Preferiti</h1>
        <p className="text-sm text-muted-foreground">
          Annunci pubblicati salvati nel tuo account.
        </p>
      </div>

      {favorites.ok ? (
        favorites.data.items.length > 0 ? (
          <>
            <div className="grid gap-3">
              {favorites.data.items.map((item) => (
                <AccountFavoriteCard
                  key={item.listing.id}
                  item={item}
                  returnPath={currentPath}
                />
              ))}
            </div>
            <PaginationFooter
              page={favorites.data.meta.page}
              totalPages={favorites.data.meta.totalPages}
              route={routes.accountFavorites}
            />
          </>
        ) : (
          <Empty className="border">
            <EmptyHeader>
              <EmptyTitle>Nessun preferito</EmptyTitle>
              <EmptyDescription>
                Salva un annuncio pubblico per ritrovarlo qui.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button asChild variant="outline">
                <Link href={routes.listings()}>Sfoglia annunci</Link>
              </Button>
            </EmptyContent>
          </Empty>
        )
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Preferiti non disponibili</CardTitle>
            <CardDescription>{favorites.message}</CardDescription>
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
            href={
              page < safeTotalPages ? `${route}?page=${page + 1}` : route
            }
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
