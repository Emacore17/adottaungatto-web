import Link from "next/link"

import { routes } from "@/lib/routes"
import { siteConfig } from "@/lib/config/site"
import { SiteLogoLink } from "@/components/layout/site-logo-link"

function SiteFooter() {
  const year = new Date().getFullYear()

  return (
    <footer className="relative overflow-hidden border-t border-brand-border/70 bg-[linear-gradient(180deg,var(--color-brand-cream)_0%,color-mix(in_oklab,var(--color-brand-teal-soft)_82%,var(--color-brand-cream))_100%)]">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr_1fr]">
          <div className="flex flex-col gap-5">
            <SiteLogoLink logoClassName="w-44 sm:w-48" />
            <p className="font-heading max-w-md text-2xl leading-tight font-normal tracking-[-0.01em] text-brand-teal-ink sm:text-3xl">
              Adozioni di gatti{" "}
              <em className="italic text-brand-coral-strong">trasparenti</em>,
              da rifugi e famiglie italiane.
            </p>
            <p className="max-w-md text-sm leading-6 text-muted-foreground">
              Schede curate, contatto diretto, zero compravendita. Una
              piattaforma costruita per chi cerca davvero un compagno.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <span className="text-[11px] font-semibold tracking-[0.28em] text-brand-coral-strong uppercase">
              Esplora
            </span>
            <nav aria-label="Link principali" className="flex flex-col gap-2">
              <Link
                href={routes.listings()}
                className="text-sm font-medium text-brand-teal-ink transition-colors hover:text-brand-coral-strong"
              >
                Annunci
              </Link>
              <Link
                href={routes.register}
                className="text-sm font-medium text-brand-teal-ink transition-colors hover:text-brand-coral-strong"
              >
                Inserisci annuncio
              </Link>
              <Link
                href={routes.login()}
                className="text-sm font-medium text-brand-teal-ink transition-colors hover:text-brand-coral-strong"
              >
                Accedi
              </Link>
            </nav>
          </div>

          <div className="flex flex-col gap-3">
            <span className="text-[11px] font-semibold tracking-[0.28em] text-brand-coral-strong uppercase">
              Progetto
            </span>
            <p className="text-sm leading-6 text-muted-foreground">
              {siteConfig.name} e indipendente. Nessun broker, nessuna asta:
              solo adozioni responsabili.
            </p>
          </div>
        </div>

        <div className="flex flex-col items-start justify-between gap-3 border-t border-brand-border/60 pt-6 sm:flex-row sm:items-center">
          <p className="text-xs tracking-wide text-muted-foreground uppercase">
            © {year} {siteConfig.name}. Tutti i diritti riservati.
          </p>
          <p className="text-xs text-muted-foreground">
            Fatto con cura in Italia.
          </p>
        </div>
      </div>
    </footer>
  )
}

export { SiteFooter }
