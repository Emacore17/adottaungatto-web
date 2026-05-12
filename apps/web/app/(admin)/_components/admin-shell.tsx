import Link from "next/link"
import {
  ArrowLeftIcon,
  LayoutDashboardIcon,
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

function AdminShell({ children }: AdminShellProps) {
  return (
    <div className="flex min-h-svh flex-col bg-muted/30">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <SiteLogoLink
                showLabel
                className="shrink-0"
                markClassName="size-9"
              />
              <Separator
                orientation="vertical"
                className="hidden h-9 md:block"
              />
              <div className="grid min-w-0 gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">Area interna</Badge>
                  <Badge variant="outline">
                    <ShieldCheckIcon
                      aria-hidden="true"
                      data-icon="inline-start"
                    />
                    Accesso protetto
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Moderazione annunci, code operative e controlli privilegiati.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline" size="sm">
                <Link href={routes.listings()}>
                  <ArrowLeftIcon aria-hidden="true" data-icon="inline-start" />
                  Sito pubblico
                </Link>
              </Button>
              <Button asChild variant="secondary" size="sm">
                <Link href={routes.account}>
                  <UserRoundIcon aria-hidden="true" data-icon="inline-start" />
                  Account
                </Link>
              </Button>
            </div>
          </div>

          <nav
            aria-label="Navigazione area interna"
            className="flex min-w-0 gap-2 overflow-x-auto pb-1"
          >
            <Button asChild size="sm">
              <Link href={routes.moderation} aria-current="page">
                <LayoutDashboardIcon
                  aria-hidden="true"
                  data-icon="inline-start"
                />
                Dashboard moderazione
              </Link>
            </Button>
          </nav>
        </div>
      </header>

      {children}
    </div>
  )
}

export { AdminShell }
