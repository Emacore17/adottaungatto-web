import { exportAccountData } from "@/lib/api/account"
import { getSessionToken } from "@/lib/auth/session"
import { privateJson } from "@/lib/http/responses"

export const dynamic = "force-dynamic"

export async function GET() {
  const token = await getSessionToken()

  if (!token) {
    return privateJson({ message: "Unauthorized." }, { status: 401 })
  }

  const result = await exportAccountData(token)

  if (!result.ok) {
    return privateJson(
      { message: result.message },
      { status: result.status ?? 502 }
    )
  }

  const date = new Date().toISOString().slice(0, 10)
  const body = JSON.stringify(result.data, null, 2)

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="adottaungatto-dati-account-${date}.json"`,
      "Cache-Control": "no-store",
    },
  })
}
