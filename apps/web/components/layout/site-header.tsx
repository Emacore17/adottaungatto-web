import Link from "next/link"
import { HeartIcon, SearchIcon } from "lucide-react"

import { routes } from "@/lib/routes"
import { Button } from "@workspace/ui/components/button"

function SiteHeader() {
  return (
    <header className="border-b bg-background/95">
      <div className="mx-auto flex min-h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link
          href={routes.home}
          className="flex min-w-0 items-center gap-2 font-heading text-base font-medium"
        >
          <span className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <HeartIcon data-icon="inline-start" aria-hidden="true" />
          </span>
          <span className="truncate">adottaungatto.it</span>
        </Link>

        <nav aria-label="Navigazione principale" className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link href={routes.listings()}>
              <SearchIcon data-icon="inline-start" aria-hidden="true" />
              Annunci
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href={routes.login(routes.accountDrafts)}>Accedi</Link>
          </Button>
        </nav>
      </div>
    </header>
  )
}

export { SiteHeader }
