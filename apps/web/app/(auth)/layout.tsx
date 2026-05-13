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
    <div className="flex min-h-svh flex-col bg-background pt-24 text-foreground sm:pt-28">
      <SiteHeader />
      <main className="flex flex-1 items-center justify-center px-4 py-10">
        {children}
      </main>
    </div>
  )
}
