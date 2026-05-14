import { notificationIdParamSchema } from "@workspace/validation/notifications"

import { markAccountNotificationRead } from "@/lib/api/account"
import { getSessionToken } from "@/lib/auth/session"
import { privateJson } from "@/lib/http/responses"
import { isTrustedRequestOrigin } from "@/lib/security/server-action-origin"

type NotificationReadRouteContext = {
  params: Promise<{
    notificationId: string
  }>
}

export const dynamic = "force-dynamic"

export async function POST(
  request: Request,
  context: NotificationReadRouteContext
) {
  if (!isTrustedRequestOrigin(request)) {
    return privateJson({ message: "Forbidden." }, { status: 403 })
  }

  const parsedParams = notificationIdParamSchema.safeParse(await context.params)

  if (!parsedParams.success) {
    return privateJson(
      { message: "Invalid notification id." },
      { status: 400 }
    )
  }

  const token = await getSessionToken()

  if (!token) {
    return privateJson({ message: "Unauthorized." }, { status: 401 })
  }

  const result = await markAccountNotificationRead(
    token,
    parsedParams.data.notificationId
  )

  if (!result.ok) {
    return privateJson(
      { message: result.message },
      { status: result.status ?? 502 }
    )
  }

  return privateJson(result.data)
}
