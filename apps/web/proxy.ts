import { NextResponse, type NextRequest } from "next/server"

import { routes } from "@/lib/routes"
import { sessionCookieName } from "@/lib/auth/constants"

const protectedPrefixes = ["/account", "/moderation"]
const isProduction = process.env.APP_ENV === "production"

// CSP minima per lo sviluppo: Turbopack e React Refresh richiedono
// 'unsafe-eval' e connessioni HMR che una policy stretta bloccherebbe.
const minimalContentSecurityPolicy = [
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
].join("; ")

// CSP stretta per la produzione. Restringe le sorgenti per default e blocca
// script/oggetti/frame esterni. Gli script inline di Next richiedono
// 'unsafe-inline' finché non si introduce una CSP con nonce per-richiesta
// (follow-up consigliato). Da validare su un deploy di preview.
const strictContentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  "script-src 'self' 'unsafe-inline'",
  "connect-src 'self'",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "upgrade-insecure-requests",
].join("; ")

const contentSecurityPolicy = isProduction
  ? strictContentSecurityPolicy
  : minimalContentSecurityPolicy

export function proxy(request: NextRequest) {
  const response =
    protectAdminHost(request) ?? protectRoutes(request) ?? NextResponse.next()

  applySecurityHeaders(request, response)

  return response
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)",
  ],
}

function protectAdminHost(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (!pathname.startsWith("/moderation")) {
    return null
  }

  if (!isProduction) {
    return null
  }

  if (isAllowedAdminHost(request)) {
    return null
  }

  return NextResponse.json({ status: 404 }, { status: 404 })
}

function isAllowedAdminHost(request: NextRequest) {
  const host = request.headers.get("host")?.split(":")[0]?.toLowerCase()

  if (!host) {
    return false
  }

  const allowedHosts = (
    process.env.ADMIN_ALLOWED_HOSTS ??
    "admin.adottaungatto.it,admin-dev.adottaungatto.it"
  )
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean)

  return allowedHosts.includes(host)
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
  response.headers.set("content-security-policy", contentSecurityPolicy)
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
