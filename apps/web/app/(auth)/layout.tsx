import type { Metadata } from "next"

import { SiteHeader } from "@/components/layout/site-header"
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
    <div className="auth-page-bg flex min-h-svh flex-col bg-background pt-24 text-foreground sm:pt-28">
      <SiteHeader />
      <main className="relative z-10 flex flex-1 items-start justify-center px-4 py-4 sm:items-center sm:px-6 sm:py-6 lg:px-8 lg:py-10">
        {children}
      </main>
    </div>
  )
}
