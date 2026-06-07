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
    <div className="flex min-h-svh flex-col bg-secondary/30 text-foreground">
      <SiteHeader />
      <main className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  )
}
