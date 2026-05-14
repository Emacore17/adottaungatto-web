import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import { LockKeyholeIcon } from "lucide-react"

import { AdminShell } from "@/app/(admin)/_components/admin-shell"
import { currentSession } from "@/lib/api/auth"
import { getSessionToken } from "@/lib/auth/session"
import { routes } from "@/lib/routes"
import { createPageMetadata } from "@/lib/seo/metadata"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"

export const metadata: Metadata = createPageMetadata({
  title: "Moderazione",
  path: "/moderation",
  noIndex: true,
})

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const token = await getSessionToken()

  if (!token) {
    redirect(routes.login(routes.moderation))
  }

  const session = await currentSession(token)

  if (!session.ok) {
    redirect(routes.login(routes.moderation))
  }

  if (!canAccessAdmin(session.data.user.roles)) {
    return <AdminAccessDenied />
  }

  return <AdminShell>{children}</AdminShell>
}

function canAccessAdmin(roles: string[] | undefined) {
  return roles?.some((role) => role === "admin" || role === "moderator") ?? false
}

function AdminAccessDenied() {
  return (
    <main className="flex min-h-[calc(100svh-4rem)] items-center justify-center bg-background px-4 py-10">
      <Card className="w-full max-w-md">
        <CardHeader className="gap-3 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-brand-olive-soft text-brand-teal-ink">
            <LockKeyholeIcon className="size-5" aria-hidden="true" />
          </div>
          <div className="grid gap-2">
            <CardTitle>Accesso alla moderazione non consentito</CardTitle>
            <CardDescription>
              Questa area e riservata agli account con ruolo moderatore o
              amministratore.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button asChild>
            <Link href={routes.account}>Vai al profilo</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={routes.home}>Torna alla home</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  )
}
