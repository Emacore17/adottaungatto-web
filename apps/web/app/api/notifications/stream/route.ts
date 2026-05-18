import { getSessionToken } from "@/lib/auth/session"
import { applyCloudflareAccessHeaders } from "@/lib/api/cloudflare-access"
import { webEnv } from "@/lib/config/env"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(request: Request) {
  const token = await getSessionToken()

  if (!token) {
    return new Response("Unauthorized", {
      status: 401,
    })
  }

  const upstream = await fetchStream(request, token)

  if (!upstream.ok || !upstream.body) {
    return new Response("Notification stream unavailable", {
      status: upstream.status,
    })
  }

  return new Response(upstream.body, {
    headers: {
      "Cache-Control": "no-store, no-transform",
      Connection: "keep-alive",
      "Content-Type": "text/event-stream; charset=utf-8",
      "X-Accel-Buffering": "no",
    },
  })
}

async function fetchStream(request: Request, token: string) {
  try {
    const headers = applyCloudflareAccessHeaders(
      new Headers({
        Accept: "text/event-stream",
        Authorization: `Bearer ${token}`,
      })
    )

    return await fetch(`${webEnv.apiBaseUrl}/notifications/stream`, {
      cache: "no-store",
      headers,
      signal: request.signal,
    })
  } catch {
    return new Response(null, {
      status: 503,
    })
  }
}
