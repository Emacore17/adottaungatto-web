import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeftIcon } from "lucide-react"

import { AuthBrandPanel } from "@/app/(auth)/_components/auth-brand-panel"
import { SiteLogoLink } from "@/components/layout/site-logo-link"
import { routes } from "@/lib/routes"
import { createPageMetadata } from "@/lib/seo/metadata"

export const metadata: Metadata = createPageMetadata({
  title: "Accesso",
  path: "/login",
  noIndex: true,
})

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <div className="grid min-h-svh bg-background text-foreground lg:grid-cols-[1.05fr_1fr] xl:grid-cols-2">
      <AuthBrandPanel />

      <div className="flex min-h-svh flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3.5 sm:px-6 lg:border-b-0 lg:px-10 lg:py-6">
          <span className="lg:hidden">
            <SiteLogoLink logoClassName="h-7 w-auto" />
          </span>
          <Link
            href={routes.home}
            className="ml-auto inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeftIcon aria-hidden="true" className="size-4" />
            Torna al sito
          </Link>
        </header>

        <main className="flex flex-1 items-center justify-center px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
          {children}
        </main>
      </div>
    </div>
  )
}
