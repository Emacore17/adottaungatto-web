import type { Metadata } from "next"

import { SiteFooter } from "@/components/layout/site-footer"
import { SiteHeader } from "@/components/layout/site-header"
import { createPageMetadata } from "@/lib/seo/metadata"

export const metadata: Metadata = createPageMetadata({
  title: "Account",
  path: "/account",
  noIndex: true,
})

export default function AccountLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      {children}
      <SiteFooter />
    </div>
  )
}
