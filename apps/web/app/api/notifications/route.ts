import { listAccountNotifications } from "@/lib/api/account"
import { getSessionToken } from "@/lib/auth/session"
import { privateJson } from "@/lib/http/responses"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const token = await getSessionToken()

  if (!token) {
    return privateJson({ message: "Unauthorized." }, { status: 401 })
  }

  const url = new URL(request.url)
  const result = await listAccountNotifications(token, {
    page: readPositiveInteger(url.searchParams.get("page"), 1),
    pageSize: readPositiveInteger(url.searchParams.get("pageSize"), 5),
    unreadOnly: readBoolean(url.searchParams.get("unreadOnly")),
  })

  if (!result.ok) {
    return privateJson(
      { message: result.message },
      { status: result.status ?? 502 }
    )
  }

  return privateJson(result.data)
}

function readPositiveInteger(value: string | null, fallback: number) {
  const parsed = value ? Number(value) : fallback

  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

function readBoolean(value: string | null) {
  return value === "true" || value === "1"
}
