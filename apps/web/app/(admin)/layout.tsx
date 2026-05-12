import type { Metadata } from "next"

import { AdminShell } from "@/app/(admin)/_components/admin-shell"
import { createPageMetadata } from "@/lib/seo/metadata"

export const metadata: Metadata = createPageMetadata({
  title: "Moderazione",
  path: "/moderation",
  noIndex: true,
})

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return <AdminShell>{children}</AdminShell>
}
