import Link from "next/link"

import { routes } from "@/lib/routes"
import { siteConfig } from "@/lib/config/site"

function SiteFooter() {
  return (
    <footer className="border-t">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-muted-foreground sm:px-6 lg:px-8">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <p>{siteConfig.name}</p>
          <nav aria-label="Link secondari" className="flex flex-wrap gap-4">
            <Link href={routes.listings()} className="hover:text-foreground">
              Annunci
            </Link>
            <Link href={routes.login()} className="hover:text-foreground">
              Accedi
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  )
}

export { SiteFooter }
