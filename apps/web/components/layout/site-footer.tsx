import Link from "next/link"

import { routes } from "@/lib/routes"
import { siteConfig } from "@/lib/config/site"
import { SiteLogoLink } from "@/components/layout/site-logo-link"

function SiteFooter() {
  const year = new Date().getFullYear()

  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-4 lg:col-span-2">
            <SiteLogoLink logoClassName="h-7 w-auto" />
            <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
              Adozioni responsabili di gatti, da rifugi, associazioni e famiglie
              italiane.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <h2 className="text-sm font-bold text-foreground">Esplora</h2>
            <nav aria-label="Esplora" className="flex flex-col gap-2">
              <Link
                href={routes.listings()}
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                Annunci
              </Link>
              <Link
                href={routes.register}
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                Inserisci annuncio
              </Link>
              <Link
                href={routes.login()}
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                Accedi
              </Link>
            </nav>
          </div>

          <div className="flex flex-col gap-3">
            <h2 className="text-sm font-bold text-foreground">Legale</h2>
            <nav aria-label="Legale" className="flex flex-col gap-2">
              <Link
                href={routes.privacy}
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                Privacy
              </Link>
              <Link
                href={routes.terms}
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                Termini
              </Link>
              <Link
                href={routes.cookie}
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                Cookie
              </Link>
            </nav>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-start justify-between gap-3 border-t border-border pt-6 sm:flex-row sm:items-center">
          <p className="text-xs text-muted-foreground">
            © {year} {siteConfig.name}. Tutti i diritti riservati.
          </p>
          <p className="text-xs text-muted-foreground">Italiano</p>
        </div>
      </div>
    </footer>
  )
}

export { SiteFooter }
