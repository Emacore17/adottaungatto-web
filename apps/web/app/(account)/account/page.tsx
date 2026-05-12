import Link from "next/link"
import type { LucideIcon } from "lucide-react"
import {
  BellIcon,
  CheckCircle2Icon,
  FileTextIcon,
  HeartIcon,
  ListChecksIcon,
  PlusIcon,
  SettingsIcon,
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
  CardAction,
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

export default async function AccountPage() {
  const { session, token } = await requireAccountSession()
  const [drafts, favorites, notifications] = await Promise.all([
    listAccountDrafts(token, { page: 1, pageSize: 3 }),
    listAccountFavorites(token, { page: 1, pageSize: 3 }),
    listAccountNotifications(token, { page: 1, pageSize: 4 }),
  ])
  const draftTotal = drafts.ok ? drafts.data.meta.total : null
  const favoriteTotal = favorites.ok ? favorites.data.meta.total : null
  const unreadNotifications = notifications.ok
    ? notifications.data.meta.unreadCount
    : null

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-5">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div className="flex flex-col gap-3">
            <Badge variant="secondary" className="w-fit">
              Area personale
            </Badge>
            <div className="grid gap-2">
              <h1 className="text-3xl font-semibold tracking-normal">
                Dashboard account
              </h1>
              <p className="text-sm text-muted-foreground">
                {session.user.displayName} - {session.user.email}
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button asChild variant="outline">
              <Link href={routes.accountSettings}>
                <SettingsIcon data-icon="inline-start" aria-hidden="true" />
                Impostazioni
              </Link>
            </Button>
            <Button asChild>
              <Link href={routes.accountDraftNew}>
                <PlusIcon data-icon="inline-start" aria-hidden="true" />
                Inserisci annuncio
              </Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <DashboardMetricCard
            title="Profilo"
            value={formatUserStatus(session.user.status)}
            description={formatProfileType(session.user.profileType)}
            icon={UserIcon}
            href={routes.accountSettings}
          />
          <DashboardMetricCard
            title="Annunci"
            value={formatMetric(draftTotal)}
            description="In lavorazione"
            icon={FileTextIcon}
            href={routes.accountDrafts}
          />
          <DashboardMetricCard
            title="Preferiti"
            value={formatMetric(favoriteTotal)}
            description="Annunci salvati"
            icon={HeartIcon}
            href={routes.accountFavorites}
          />
          <DashboardMetricCard
            title="Notifiche"
            value={formatMetric(unreadNotifications)}
            description="Da leggere"
            icon={BellIcon}
            href={routes.accountNotifications}
          />
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex flex-col gap-6">
          <OperationalFocus
            draftTotal={draftTotal}
            favoriteTotal={favoriteTotal}
            unreadNotifications={unreadNotifications}
          />

          <section className="flex flex-col gap-4">
            <SectionHeader
              title="Annunci in lavorazione"
              description="Bozze e inserimenti da completare."
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
                  title="Nessun annuncio in lavorazione"
                  description="Gli annunci inseriti appariranno qui prima della pubblicazione."
                />
              )
            ) : (
              <AccountError message={drafts.message} />
            )}
          </section>
        </div>

        <aside className="flex flex-col gap-6">
          <ProfileCard
            displayName={session.user.displayName}
            email={session.user.email}
            profileType={session.user.profileType}
            status={session.user.status}
          />

          <QuickActionsCard />

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
                      returnPath={routes.account}
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

function DashboardMetricCard({
  description,
  icon,
  href,
  title,
  value,
}: {
  description: string
  href: string
  icon: LucideIcon
  title: string
  value: string
}) {
  const Icon = icon

  return (
    <Card size="sm">
      <CardHeader>
        <div className="grid gap-1">
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <CardAction>
          <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
            <Icon aria-hidden="true" />
          </div>
        </CardAction>
      </CardHeader>
      <CardContent className="flex items-end justify-between gap-3">
        <p className="text-2xl font-semibold tracking-normal">{value}</p>
        <Button asChild variant="outline" size="sm">
          <Link href={href}>Apri</Link>
        </Button>
      </CardContent>
    </Card>
  )
}

function OperationalFocus({
  draftTotal,
  favoriteTotal,
  unreadNotifications,
}: {
  draftTotal: number | null
  favoriteTotal: number | null
  unreadNotifications: number | null
}) {
  const hasDrafts = draftTotal !== null && draftTotal > 0
  const hasUnreadNotifications =
    unreadNotifications !== null && unreadNotifications > 0

  return (
    <Card>
      <CardHeader>
        <CardTitle>Attivita operative</CardTitle>
        <CardDescription>Le priorita correnti del tuo account.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <PriorityRow
          icon={hasDrafts ? ListChecksIcon : PlusIcon}
          title={
            hasDrafts
              ? "Riprendi annunci in lavorazione"
              : "Inserisci un annuncio"
          }
          description={
            hasDrafts
              ? `${draftTotal} annunci non ancora inviati a revisione.`
              : "Nessuna bozza aperta."
          }
          badge={hasDrafts ? "Da completare" : "Pronto"}
          href={hasDrafts ? routes.accountDrafts : routes.accountDraftNew}
          actionLabel={hasDrafts ? "Vai alle bozze" : "Inserisci annuncio"}
        />
        <Separator />
        <PriorityRow
          icon={hasUnreadNotifications ? BellIcon : CheckCircle2Icon}
          title={
            hasUnreadNotifications
              ? "Controlla gli aggiornamenti"
              : "Notifiche in ordine"
          }
          description={
            hasUnreadNotifications
              ? `${unreadNotifications} notifiche non lette.`
              : "Nessuna notifica non letta."
          }
          badge={hasUnreadNotifications ? "Da leggere" : "Aggiornato"}
          href={routes.accountNotifications}
          actionLabel="Apri notifiche"
        />
        <Separator />
        <PriorityRow
          icon={HeartIcon}
          title="Preferiti salvati"
          description={
            favoriteTotal === null
              ? "Dato non disponibile."
              : `${favoriteTotal} annunci salvati.`
          }
          badge="Consultazione"
          href={routes.accountFavorites}
          actionLabel="Apri preferiti"
        />
      </CardContent>
    </Card>
  )
}

function PriorityRow({
  actionLabel,
  badge,
  description,
  href,
  icon,
  title,
}: {
  actionLabel: string
  badge: string
  description: string
  href: string
  icon: LucideIcon
  title: string
}) {
  const Icon = icon

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
          <Icon aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-medium tracking-normal">{title}</h3>
            <Badge variant="outline">{badge}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      <Button asChild variant="outline" size="sm">
        <Link href={href}>{actionLabel}</Link>
      </Button>
    </div>
  )
}

function ProfileCard({
  displayName,
  email,
  profileType,
  status,
}: {
  displayName: string
  email: string
  profileType: string
  status: string
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Profilo</CardTitle>
        <CardDescription>{displayName}</CardDescription>
        <CardAction>
          <Badge variant="secondary">{formatUserStatus(status)}</Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 text-sm">
        <div className="grid gap-3">
          <InfoRow label="Email" value={email} />
          <InfoRow label="Tipo" value={formatProfileType(profileType)} />
          <InfoRow label="Stato" value={formatUserStatus(status)} />
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href={routes.accountSettings}>Modifica profilo</Link>
        </Button>
      </CardContent>
    </Card>
  )
}

function QuickActionsCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Azioni rapide</CardTitle>
        <CardDescription>Collegamenti principali.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-2">
        <Button asChild className="justify-start">
          <Link href={routes.accountDraftNew}>
            <PlusIcon data-icon="inline-start" aria-hidden="true" />
            Inserisci annuncio
          </Link>
        </Button>
        <Button asChild variant="outline" className="justify-start">
          <Link href={routes.accountDrafts}>
            <FileTextIcon data-icon="inline-start" aria-hidden="true" />
            Annunci in lavorazione
          </Link>
        </Button>
        <Button asChild variant="outline" className="justify-start">
          <Link href={routes.accountFavorites}>
            <HeartIcon data-icon="inline-start" aria-hidden="true" />
            Preferiti
          </Link>
        </Button>
        <Button asChild variant="outline" className="justify-start">
          <Link href={routes.accountSettings}>
            <SettingsIcon data-icon="inline-start" aria-hidden="true" />
            Impostazioni
          </Link>
        </Button>
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

function formatMetric(value: number | null) {
  return value === null ? "-" : String(value)
}

function formatProfileType(value: string) {
  if (value === "owner") {
    return "Proprietario"
  }

  if (value === "association") {
    return "Associazione"
  }

  if (value === "shelter") {
    return "Rifugio"
  }

  return "Privato"
}

function formatUserStatus(value: string) {
  if (value === "active") {
    return "Attivo"
  }

  if (value === "suspended") {
    return "Sospeso"
  }

  return value
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
