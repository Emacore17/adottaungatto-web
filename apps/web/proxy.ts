import { NextResponse, type NextRequest } from "next/server"

import { routes } from "@/lib/routes"
import { sessionCookieName } from "@/lib/auth/constants"

const protectedPrefixes = ["/account", "/moderation"]
const isProduction = process.env.APP_ENV === "production"
const minimalContentSecurityPolicy = [
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
].join("; ")

export function proxy(request: NextRequest) {
  const response = protectRoutes(request) ?? NextResponse.next()

  applySecurityHeaders(request, response)

  return response
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)",
  ],
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

function applySecurityHeaders(request: NextRequest, response: NextResponse) {
  response.headers.set("content-security-policy", minimalContentSecurityPolicy)
  response.headers.set("cross-origin-opener-policy", "same-origin")
  response.headers.set("origin-agent-cluster", "?1")
  response.headers.set(
    "permissions-policy",
    "camera=(), microphone=(), payment=(), usb=(), geolocation=(self)"
  )
  response.headers.set("referrer-policy", "strict-origin-when-cross-origin")
  response.headers.set("x-content-type-options", "nosniff")
  response.headers.set("x-frame-options", "DENY")

  if (isProduction && isHttpsRequest(request)) {
    response.headers.set(
      "strict-transport-security",
      "max-age=31536000; includeSubDomains; preload"
    )
  }
}

function isHttpsRequest(request: NextRequest) {
  return (
    request.nextUrl.protocol === "https:" ||
    request.headers.get("x-forwarded-proto") === "https"
  )
}
