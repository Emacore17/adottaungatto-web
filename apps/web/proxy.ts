import { NextResponse, type NextRequest } from "next/server"

import { routes } from "@/lib/routes"
import { sessionCookieName } from "@/lib/auth/constants"

const protectedPrefixes = ["/account", "/moderation"]

export function proxy(request: NextRequest) {
  const response = protectRoutes(request) ?? NextResponse.next()

  response.headers.set("x-content-type-options", "nosniff")
  response.headers.set("referrer-policy", "strict-origin-when-cross-origin")

  return response
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)"],
}

function protectRoutes(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isProtected = protectedPrefixes.some((prefix) =>
    pathname.startsWith(prefix)
  )

  if (!isProtected || request.cookies.has(sessionCookieName)) {
    return null
  }

  const loginUrl = request.nextUrl.clone()
  loginUrl.pathname = routes.login()
  loginUrl.search = new URLSearchParams({ next: pathname }).toString()

  return NextResponse.redirect(loginUrl)
}
