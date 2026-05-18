import { webEnv } from "@/lib/config/env"

export function applyCloudflareAccessHeaders(headers: Headers) {
  if (
    !webEnv.cloudflareAccessClientId ||
    !webEnv.cloudflareAccessClientSecret
  ) {
    return headers
  }

  headers.set("CF-Access-Client-Id", webEnv.cloudflareAccessClientId)
  headers.set("CF-Access-Client-Secret", webEnv.cloudflareAccessClientSecret)

  return headers
}
