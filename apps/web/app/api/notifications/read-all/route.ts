import { markAllAccountNotificationsRead } from "@/lib/api/account"
import { getSessionToken } from "@/lib/auth/session"
import { privateJson } from "@/lib/http/responses"
import { isTrustedRequestOrigin } from "@/lib/security/server-action-origin"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  if (!isTrustedRequestOrigin(request)) {
    return privateJson({ message: "Forbidden." }, { status: 403 })
  }

  const token = await getSessionToken()

  if (!token) {
    return privateJson({ message: "Unauthorized." }, { status: 401 })
  }

  const result = await markAllAccountNotificationsRead(token)

  if (!result.ok) {
    return privateJson(
      { message: result.message },
      { status: result.status ?? 502 }
    )
  }

  return privateJson(result.data)
}
