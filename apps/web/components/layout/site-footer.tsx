import Link from "next/link"

import { routes } from "@/lib/routes"
import { siteConfig } from "@/lib/config/site"
import { SiteLogoLink } from "@/components/layout/site-logo-link"

function SiteFooter() {
  return (
    <footer className="border-t border-border/80 bg-secondary/55">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-8 text-sm text-muted-foreground sm:px-6 lg:px-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex flex-col gap-2">
            <SiteLogoLink logoClassName="w-44 sm:w-48" />
            <p>{siteConfig.name}</p>
          </div>
          <nav aria-label="Link secondari" className="flex flex-wrap gap-4">
            <Link
              href={routes.listings()}
              className="transition-colors hover:text-brand-coral-strong"
            >
              Annunci
            </Link>
            <Link
              href={routes.login()}
              className="transition-colors hover:text-brand-coral-strong"
            >
              Accedi
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  )
}

export { SiteFooter }
