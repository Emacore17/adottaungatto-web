import { webEnv } from "@/lib/config/env"

type NextFetchInit = RequestInit & {
  next?: {
    revalidate?: number
    tags?: string[]
  }
}

type ApiFetchOptions = {
  bearerToken?: string | null
  body?: unknown
  cache?: RequestCache
  method?: "DELETE" | "GET" | "PATCH" | "POST" | "PUT"
  revalidate?: number
  headers?: HeadersInit
  tags?: string[]
  timeoutMs?: number
}

type ApiErrorPayload = {
  issues?: unknown
  message?: unknown
  reason?: unknown
  retryAfterSeconds?: unknown
}

export type ApiResult<T> =
  | {
      ok: true
      data: T
    }
  | {
      ok: false
      message: string
      status: number | null
    }

export async function apiFetch<T>(
  path: string,
  options: ApiFetchOptions = {}
): Promise<ApiResult<T>> {
  const controller = new AbortController()
  const timeout = setTimeout(() => {
    controller.abort()
  }, options.timeoutMs ?? 5000)

  const init: NextFetchInit = {
    headers: createHeaders(options),
    method: options.method ?? "GET",
    signal: controller.signal,
  }

  if (options.body !== undefined) {
    init.body = JSON.stringify(options.body)
  }

  if (options.cache) {
    init.cache = options.cache
  }

  if (options.revalidate !== undefined || options.tags?.length) {
    init.next = {
      revalidate: options.revalidate,
      tags: options.tags,
    }
  }

  try {
    const response = await fetch(createApiUrl(path), init)

    if (!response.ok) {
      const payload = await readApiErrorPayload(response)

      return {
        ok: false,
        message: createUserFacingApiMessage(response.status, payload),
        status: response.status,
      }
    }

    return {
      ok: true,
      data: (await response.json()) as T,
    }
  } catch (error) {
    return {
      ok: false,
      message: createNetworkErrorMessage(error),
      status: null,
    }
  } finally {
    clearTimeout(timeout)
  }
}

function createApiUrl(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`

  return `${webEnv.apiBaseUrl}${normalizedPath}`
}

function createHeaders(options: ApiFetchOptions) {
  const headers = new Headers(options.headers)

  headers.set("Accept", "application/json")

  if (options.body !== undefined) {
    headers.set("Content-Type", "application/json")
  }

  if (options.bearerToken) {
    headers.set("Authorization", `Bearer ${options.bearerToken}`)
  }

  return headers
}

async function readApiErrorPayload(
  response: Response
): Promise<ApiErrorPayload | null> {
  let text: string

  try {
    text = await response.text()
  } catch {
    return null
  }

  if (!text) {
    return null
  }

  try {
    const parsed: unknown = JSON.parse(text)

    return isRecord(parsed) ? parsed : null
  } catch {
    return null
  }
}

function createUserFacingApiMessage(
  status: number,
  payload: ApiErrorPayload | null
) {
  if (status === 400) {
    return "Controlla i dati inseriti e riprova."
  }

  if (status === 401) {
    return "Accedi di nuovo per continuare."
  }

  if (status === 403) {
    return "Non hai i permessi per completare questa operazione."
  }

  if (status === 404) {
    return "Il contenuto richiesto non e' disponibile o non appartiene al tuo account."
  }

  if (status === 408) {
    return "Il servizio non ha risposto in tempo. Riprova tra poco."
  }

  if (status === 409) {
    return "Questa operazione entra in conflitto con dati gia' presenti."
  }

  if (status === 413) {
    return "Il file e' troppo grande per essere caricato."
  }

  if (status === 415) {
    return "Il formato del file non e' supportato."
  }

  if (status === 422) {
    return hasValidationIssues(payload)
      ? "Alcuni dati non sono validi. Controlla i campi e riprova."
      : "La richiesta non puo' essere completata con i dati attuali."
  }

  if (status === 429) {
    return createRateLimitMessage(payload)
  }

  if (status >= 500) {
    return "Il servizio non e' disponibile al momento. Riprova tra poco."
  }

  return "Non riesco a completare l'operazione. Riprova tra poco."
}

function createRateLimitMessage(payload: ApiErrorPayload | null) {
  const reason = readString(payload?.reason)
  const retryAfter = formatRetryAfter(readNumber(payload?.retryAfterSeconds))
  const baseMessage = reason
    ? rateLimitMessageByReason(reason)
    : "Hai effettuato troppe richieste. Attendi prima di riprovare."

  return retryAfter ? `${baseMessage} ${retryAfter}` : baseMessage
}

function rateLimitMessageByReason(reason: string) {
  if (reason.startsWith("listing_contact_")) {
    return "Hai gia' inviato una richiesta di contatto per questo annuncio."
  }

  if (reason === "requester_hourly_limit") {
    return "Hai inviato troppe richieste di contatto in poco tempo."
  }

  if (reason.startsWith("auth_login_")) {
    return "Troppi tentativi di accesso. Attendi prima di riprovare."
  }

  if (reason.startsWith("auth_register_")) {
    return "Troppi tentativi di registrazione. Attendi prima di riprovare."
  }

  if (reason.includes("password")) {
    return "Troppi tentativi sul recupero o cambio password. Attendi prima di riprovare."
  }

  if (
    reason.includes("email_verification") ||
    reason.includes("email-verification")
  ) {
    return "Troppi tentativi di verifica email. Attendi prima di riprovare."
  }

  return "Hai effettuato troppe richieste. Attendi prima di riprovare."
}

function formatRetryAfter(value: number | null) {
  if (value === null) {
    return null
  }

  const seconds = Math.max(1, Math.ceil(value))

  if (seconds < 60) {
    return `Riprova tra circa ${seconds} secondi.`
  }

  const minutes = Math.ceil(seconds / 60)

  if (minutes < 60) {
    return `Riprova tra circa ${minutes} minuti.`
  }

  const hours = Math.ceil(minutes / 60)

  if (hours < 24) {
    return `Riprova tra circa ${hours} ore.`
  }

  return `Riprova tra circa ${Math.ceil(hours / 24)} giorni.`
}

function createNetworkErrorMessage(error: unknown) {
  if (error instanceof Error && error.name === "AbortError") {
    return "Il servizio non ha risposto in tempo. Riprova tra poco."
  }

  return "Non riesco a raggiungere il servizio. Verifica che la demo locale sia avviata e riprova."
}

function hasValidationIssues(payload: ApiErrorPayload | null) {
  return Array.isArray(payload?.issues) && payload.issues.length > 0
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null
}

function readNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value)

    return Number.isFinite(parsed) ? parsed : null
  }

  return null
}

function isRecord(value: unknown): value is ApiErrorPayload {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}
