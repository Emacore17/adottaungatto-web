import { NextResponse } from "next/server"

import { finishGoogleLogin } from "@/lib/api/auth"
import { setSessionCookie } from "@/lib/auth/cookies"
import { routes } from "@/lib/routes"

// Finalizza il login Google: l'API ci ridirige qui con un codice monouso,
// lo scambiamo per la sessione, impostiamo il cookie e portiamo l'utente
// nell'area account. Il codice monouso evita di esporre il token in URL.
export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const errorUrl = new URL(`${routes.login()}?error=google`, requestUrl.origin)

  if (!code) {
    return NextResponse.redirect(errorUrl)
  }

  const result = await finishGoogleLogin(code)

  if (!result.ok) {
    return NextResponse.redirect(errorUrl)
  }

  await setSessionCookie(result.data.session)

  return NextResponse.redirect(new URL(routes.account, requestUrl.origin))
}
