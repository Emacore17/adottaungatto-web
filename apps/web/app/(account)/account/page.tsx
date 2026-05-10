import Link from "next/link"
import {
  BellIcon,
  FileTextIcon,
  HeartIcon,
  PlusIcon,
  UserIcon,
} from "lucide-react"

import { AccountDraftCard } from "@/app/(account)/account/_components/account-draft-card"
import { AccountFavoriteCard } from "@/app/(account)/account/_components/account-favorite-card"
import { AccountNotificationCard } from "@/app/(account)/account/_components/account-notification-card"
import { requireAccountSession } from "@/app/(account)/account/_lib/session"
import {
  listAccountDrafts,
  listAccountFavorites,
  listAccountNotifications,
} from "@/lib/api/account"
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

export default async function AccountPage() {
  const { session, token } = await requireAccountSession()
  const [drafts, favorites, notifications] = await Promise.all([
    listAccountDrafts(token, { page: 1, pageSize: 3 }),
    listAccountFavorites(token, { page: 1, pageSize: 3 }),
    listAccountNotifications(token, { page: 1, pageSize: 4 }),
  ])

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div className="flex flex-col gap-3">
          <Badge variant="secondary" className="w-fit">
            Area personale
          </Badge>
          <div className="grid gap-2">
            <h1 className="text-3xl font-semibold tracking-normal">Account</h1>
            <p className="text-sm text-muted-foreground">
              {session.user.displayName}
            </p>
          </div>
        </div>
        <Button asChild>
          <Link href={routes.accountDraftNew}>
            <PlusIcon data-icon="inline-start" aria-hidden="true" />
            Nuovo annuncio
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          title="Profilo"
          value={session.user.status}
          description={session.user.email}
          icon="user"
        />
        <SummaryCard
          title="Bozze"
          value={drafts.ok ? String(drafts.data.meta.total) : "-"}
          description="Annunci salvati"
          icon="drafts"
        />
        <SummaryCard
          title="Preferiti"
          value={favorites.ok ? String(favorites.data.meta.total) : "-"}
          description="Annunci seguiti"
          icon="favorites"
        />
        <SummaryCard
          title="Notifiche"
          value={
            notifications.ok ? String(notifications.data.meta.unreadCount) : "-"
          }
          description="Non lette"
          icon="notifications"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <section className="flex flex-col gap-4">
          <SectionHeader
            title="Bozze recenti"
            description="Annunci in lavorazione nel tuo account."
            href={routes.accountDrafts}
          />
          {drafts.ok ? (
            drafts.data.items.length > 0 ? (
              <div className="grid gap-3">
                {drafts.data.items.map((draft) => (
                  <AccountDraftCard key={draft.id} draft={draft} />
                ))}
              </div>
            ) : (
              <AccountEmpty
                title="Nessuna bozza"
                description="Le bozze create appariranno qui."
              />
            )
          ) : (
            <AccountError message={drafts.message} />
          )}
        </section>

        <aside className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Profilo</CardTitle>
              <CardDescription>{session.user.email}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm">
              <InfoRow label="Tipo" value={session.user.profileType} />
              <InfoRow label="Stato" value={session.user.status} />
            </CardContent>
          </Card>

          <section className="flex flex-col gap-3">
            <SectionHeader
              title="Notifiche"
              description="Aggiornamenti recenti."
              href={routes.accountNotifications}
            />
            {notifications.ok ? (
              notifications.data.items.length > 0 ? (
                <div className="grid gap-3">
                  {notifications.data.items.slice(0, 2).map((notification) => (
                    <AccountNotificationCard
                      key={notification.id}
                      notification={notification}
                    />
                  ))}
                </div>
              ) : (
                <AccountEmpty
                  title="Nessuna notifica"
                  description="Gli aggiornamenti appariranno qui."
                />
              )
            ) : (
              <AccountError message={notifications.message} />
            )}
          </section>
        </aside>
      </div>

      <section className="flex flex-col gap-4">
        <SectionHeader
          title="Preferiti recenti"
          description="Annunci pubblicati salvati nel tuo profilo."
          href={routes.accountFavorites}
        />
        {favorites.ok ? (
          favorites.data.items.length > 0 ? (
            <div className="grid gap-3">
              {favorites.data.items.map((item) => (
                <AccountFavoriteCard
                  key={item.listing.id}
                  item={item}
                  returnPath={routes.account}
                />
              ))}
            </div>
          ) : (
            <AccountEmpty
              title="Nessun preferito"
              description="Salva un annuncio per ritrovarlo in questa sezione."
            />
          )
        ) : (
          <AccountError message={favorites.message} />
        )}
      </section>
    </main>
  )
}

function SummaryCard({
  description,
  icon,
  title,
  value,
}: {
  description: string
  icon: "drafts" | "favorites" | "notifications" | "user"
  title: string
  value: string
}) {
  const Icon =
    icon === "drafts"
      ? FileTextIcon
      : icon === "favorites"
        ? HeartIcon
        : icon === "notifications"
          ? BellIcon
          : UserIcon

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-4">
        <div className="grid gap-1">
          <CardTitle className="text-base">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
          <Icon aria-hidden="true" className="size-5" />
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold tracking-normal">{value}</p>
      </CardContent>
    </Card>
  )
}

function SectionHeader({
  description,
  href,
  title,
}: {
  description: string
  href: string
  title: string
}) {
  return (
    <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
      <div className="grid gap-1">
        <h2 className="text-2xl font-semibold tracking-normal">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <Button asChild variant="outline" size="sm">
        <Link href={href}>Vedi tutto</Link>
      </Button>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  )
}

function AccountEmpty({
  description,
  title,
}: {
  description: string
  title: string
}) {
  return (
    <Empty className="border">
      <EmptyHeader>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  )
}

function AccountError({ message }: { message: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Dati non disponibili</CardTitle>
        <CardDescription>{message}</CardDescription>
      </CardHeader>
    </Card>
  )
}
