import { headers } from "next/headers"

import { webEnv } from "@/lib/config/env"

const trustedActionOrigins = [
  webEnv.siteUrl,
  ...(process.env.TRUSTED_ACTION_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
]
  .map(normalizeOrigin)
  .filter((origin): origin is string => origin !== null)
const isProduction = webEnv.appEnv === "production"

type HeaderReader = {
  get(name: string): string | null
}

export async function assertTrustedActionOrigin() {
  const headerStore = await headers()
  assertTrustedHeaders(headerStore)
}

export function assertTrustedRequestOrigin(request: Request) {
  assertTrustedHeaders(request.headers)
}

export function isTrustedRequestOrigin(request: Request) {
  return isTrustedHeaders(request.headers)
}

function assertTrustedHeaders(headerStore: HeaderReader) {
  if (!isTrustedHeaders(headerStore)) {
    throw new Error("Untrusted request origin.")
  }
}

function isTrustedHeaders(headerStore: HeaderReader) {
  const sourceOrigin =
    normalizeOrigin(headerStore.get("origin")) ??
    normalizeRefererOrigin(headerStore.get("referer"))

  if (!sourceOrigin) {
    const fetchSite = headerStore.get("sec-fetch-site")

    if (fetchSite === "same-origin" || fetchSite === "none") {
      return true
    }

    return false
  }

  return (
    trustedActionOrigins.includes(sourceOrigin) ||
    (!isProduction && isLocalDevelopmentOrigin(sourceOrigin))
  )
}

function normalizeRefererOrigin(value: string | null) {
  if (!value) {
    return null
  }

  try {
    return normalizeOrigin(new URL(value).origin)
  } catch {
    return null
  }
}

function normalizeOrigin(value: string | null | undefined) {
  if (!value) {
    return null
  }

  try {
    const url = new URL(value)

    return url.origin.toLowerCase()
  } catch {
    return null
  }
}

function isLocalDevelopmentOrigin(origin: string) {
  try {
    const { hostname } = new URL(origin)

    return (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "::1" ||
      hostname === "[::1]"
    )
  } catch {
    return false
  }
}
