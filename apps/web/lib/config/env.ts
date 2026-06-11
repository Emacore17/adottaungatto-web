function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "")
}

function readUrl(value: string | undefined, fallback: string) {
  const candidate = value?.trim() || fallback

  try {
    return trimTrailingSlash(new URL(candidate).toString())
  } catch {
    return trimTrailingSlash(fallback)
  }
}

function readBoolean(value: string | undefined, fallback: boolean) {
  if (value === undefined || value === null || value === "") {
    return fallback
  }

  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase())
}

export const webEnv = {
  appEnv: process.env.APP_ENV ?? "local",
  apiBaseUrl: readUrl(
    process.env.API_INTERNAL_URL ?? process.env.API_URL,
    "http://localhost:4000"
  ),
  publicApiBaseUrl: readUrl(
    process.env.NEXT_PUBLIC_API_URL ?? process.env.API_URL,
    "http://localhost:4000"
  ),
  siteUrl: readUrl(
    process.env.NEXT_PUBLIC_SITE_URL ?? process.env.APP_URL,
    "http://localhost:3000"
  ),
  storageBucket:
    process.env.NEXT_PUBLIC_S3_BUCKET ??
    process.env.S3_BUCKET ??
    "adottaungatto-local",
  storagePublicUrl: readUrl(
    process.env.NEXT_PUBLIC_S3_PUBLIC_ENDPOINT ??
      process.env.S3_PUBLIC_ENDPOINT,
    "http://localhost:9000"
  ),
  storagePublicPathStyle: readBoolean(
    process.env.NEXT_PUBLIC_S3_PUBLIC_PATH_STYLE ??
      process.env.S3_PUBLIC_PATH_STYLE,
    true
  ),
}

export const isProduction = webEnv.appEnv === "production"
