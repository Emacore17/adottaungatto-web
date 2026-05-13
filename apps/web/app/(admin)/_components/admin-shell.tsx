"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  ArrowLeftIcon,
  GaugeIcon,
  LayoutDashboardIcon,
  ListChecksIcon,
  ShieldCheckIcon,
  UserRoundIcon,
} from "lucide-react"

import { SiteLogoLink } from "@/components/layout/site-logo-link"
import { routes } from "@/lib/routes"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Separator } from "@workspace/ui/components/separator"

type AdminShellProps = {
  children: React.ReactNode
}

const adminNavigationItems = [
  {
    description: "KPI, code e priorita",
    href: routes.moderation,
    icon: LayoutDashboardIcon,
    label: "Dashboard",
  },
  {
    description: "Decisioni rapide",
    href: routes.moderationQueue,
    icon: ListChecksIcon,
    label: "Coda rapida",
  },
] as const

function AdminShell({ children }: AdminShellProps) {
  const pathname = usePathname()

  return (
    <div className="min-h-svh bg-secondary/35 text-foreground">
      <aside className="fixed inset-y-0 left-0 hidden w-72 flex-col border-r border-border/80 bg-card/95 shadow-sm lg:flex">
        <div className="flex min-h-0 flex-1 flex-col gap-6 px-5 py-5">
          <div className="flex flex-col gap-4">
            <SiteLogoLink logoClassName="w-52" />
            <div className="flex flex-wrap gap-2">
              <Badge className="bg-brand-teal-soft text-brand-teal-ink">
                Admin
              </Badge>
              <Badge
                variant="outline"
                className="border-brand-olive/30 bg-brand-olive-soft text-brand-teal-ink"
              >
                <ShieldCheckIcon aria-hidden="true" data-icon="inline-start" />
                Protetto
              </Badge>
            </div>
          </div>

          <Separator />

          <nav aria-label="Navigazione admin" className="flex flex-col gap-2">
            {adminNavigationItems.map((item) => (
              <AdminNavButton
                key={item.href}
                description={item.description}
                href={item.href}
                icon={item.icon}
                isActive={isActiveAdminPath(pathname, item.href)}
                label={item.label}
              />
            ))}
          </nav>

          <div className="mt-auto grid gap-2">
            <Button asChild variant="outline" className="justify-start">
              <Link href={routes.listings()}>
                <ArrowLeftIcon aria-hidden="true" data-icon="inline-start" />
                Sito pubblico
              </Link>
            </Button>
            <Button asChild variant="secondary" className="justify-start">
              <Link href={routes.account}>
                <UserRoundIcon aria-hidden="true" data-icon="inline-start" />
                Account
              </Link>
            </Button>
          </div>
        </div>
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-40 border-b border-border/80 bg-card/95 shadow-sm backdrop-blur-xl lg:hidden">
          <div className="flex flex-col gap-3 px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <SiteLogoLink logoClassName="w-44 max-w-[58vw]" />
              <div className="flex items-center gap-2">
                <Button asChild variant="ghost" size="icon-sm">
                  <Link href={routes.listings()} aria-label="Sito pubblico">
                    <ArrowLeftIcon aria-hidden="true" />
                  </Link>
                </Button>
                <Button asChild variant="ghost" size="icon-sm">
                  <Link href={routes.account} aria-label="Account">
                    <UserRoundIcon aria-hidden="true" />
                  </Link>
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3">
              <Badge className="bg-brand-teal-soft text-brand-teal-ink">
                <GaugeIcon aria-hidden="true" data-icon="inline-start" />
                Area admin
              </Badge>
              <Badge
                variant="outline"
                className="border-brand-olive/30 bg-brand-olive-soft text-brand-teal-ink"
              >
                Protetto
              </Badge>
            </div>

            <nav
              aria-label="Navigazione admin mobile"
              className="flex min-w-0 gap-2 overflow-x-auto pb-1"
            >
              {adminNavigationItems.map((item) => {
                const Icon = item.icon
                const isActive = isActiveAdminPath(pathname, item.href)

                return (
                  <Button
                    key={item.href}
                    asChild
                    size="sm"
                    variant={isActive ? "default" : "outline"}
                  >
                    <Link
                      href={item.href}
                      aria-current={isActive ? "page" : undefined}
                    >
                      <Icon aria-hidden="true" data-icon="inline-start" />
                      {item.label}
                    </Link>
                  </Button>
                )
              })}
            </nav>
          </div>
        </header>

        {children}
      </div>
    </div>
  )
}

function AdminNavButton({
  description,
  href,
  icon: Icon,
  isActive,
  label,
}: {
  description: string
  href: string
  icon: typeof LayoutDashboardIcon
  isActive: boolean
  label: string
}) {
  return (
    <Button
      asChild
      variant={isActive ? "default" : "ghost"}
      className="h-auto justify-start px-3 py-3"
    >
      <Link href={href} aria-current={isActive ? "page" : undefined}>
        <Icon aria-hidden="true" data-icon="inline-start" />
        <span className="grid gap-0.5 text-left">
          <span>{label}</span>
          <span className="text-xs font-normal opacity-75">{description}</span>
        </span>
      </Link>
    </Button>
  )
}

function isActiveAdminPath(pathname: string, href: string) {
  if (href === routes.moderation) {
    return pathname === routes.moderation
  }

  return pathname === href || pathname.startsWith(`${href}/`)
}

export { AdminShell }
