import { NextResponse, type NextRequest } from "next/server"

// Content-Security-Policy con nonce per-richiesta. Il nonce viene propagato agli
// script di Next automaticamente (Next lo legge dall'header CSP della richiesta)
// e manualmente al blocco JSON-LD (`components/shared/json-ld.tsx`), che legge
// l'header `x-nonce`. `strict-dynamic` fa si' che solo gli script con il nonce
// (e quelli che caricano a cascata) vengano eseguiti: niente inline injection.
const isProduction = process.env.APP_ENV === "production"

function readOrigin(value: string | undefined, fallback: string): string {
  const candidate = value?.trim() || fallback

  try {
    return new URL(candidate).origin
  } catch {
    return new URL(fallback).origin
  }
}

// L'origine dello storage pubblico (S3/MinIO) da cui il browser carica le
// immagini via <img>. L'upload PUT avviene lato server (server action), quindi
// non serve in connect-src.
const storageOrigin = readOrigin(
  process.env.NEXT_PUBLIC_S3_PUBLIC_ENDPOINT ?? process.env.S3_PUBLIC_ENDPOINT,
  "http://localhost:9000"
)

function buildContentSecurityPolicy(nonce: string): string {
  const scriptSrc = [
    "script-src 'self'",
    `'nonce-${nonce}'`,
    "'strict-dynamic'",
    // In sviluppo Next usa eval per l'HMR; in produzione niente eval.
    isProduction ? "" : "'unsafe-eval'",
  ]
    .filter(Boolean)
    .join(" ")

  const directives = [
    "default-src 'self'",
    "base-uri 'none'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    `img-src 'self' data: blob: ${storageOrigin}`,
    "font-src 'self'",
    // Tailwind, next/font e alcune UI (sonner) iniettano stili inline.
    "style-src 'self' 'unsafe-inline'",
    "connect-src 'self'",
    scriptSrc,
  ]

  if (isProduction) {
    directives.push("upgrade-insecure-requests")
  }

  return directives.join("; ")
}

export function middleware(request: NextRequest) {
  const nonce = crypto.randomUUID().replaceAll("-", "")
  const csp = buildContentSecurityPolicy(nonce)

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set("x-nonce", nonce)
  // Next legge la CSP dall'header di richiesta per iniettare il nonce nei suoi
  // script; deve corrispondere all'header di risposta.
  requestHeaders.set("content-security-policy", csp)

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  })
  response.headers.set("content-security-policy", csp)

  return response
}

export const config = {
  matcher: [
    {
      // Applica a tutte le route tranne asset statici e ottimizzazione immagini.
      source:
        "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|css|js|woff2?)$).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
}
