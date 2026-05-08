import type { Metadata } from "next"
import Link from "next/link"

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
    <main className="flex min-h-svh flex-col bg-background">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-5 sm:px-6 lg:px-8">
        <Link href={routes.home} className="font-medium">
          adottaungatto.it
        </Link>
        <Link href={routes.listings()} className="text-sm text-muted-foreground">
          Annunci
        </Link>
      </div>
      <div className="flex flex-1 items-center justify-center px-4 py-10">
        {children}
      </div>
    </main>
  )
}
