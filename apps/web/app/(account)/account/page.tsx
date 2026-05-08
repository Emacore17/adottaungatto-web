import { redirect } from "next/navigation"

import { currentSession } from "@/lib/api/auth"
import { getSessionToken } from "@/lib/auth/session"
import { routes } from "@/lib/routes"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"

export default async function AccountPage() {
  const token = await getSessionToken()

  if (!token) {
    redirect(routes.login(routes.account))
  }

  const session = await currentSession(token)

  if (!session.ok) {
    redirect(routes.login(routes.account))
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <div>
        <h1 className="text-3xl font-medium">Account</h1>
        <p className="text-sm text-muted-foreground">
          {session.data.user.displayName}
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Profilo</CardTitle>
            <CardDescription>{session.data.user.email}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm">
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Tipo</span>
              <span>{session.data.user.profileType}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Stato</span>
              <span>{session.data.user.status}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
