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
      return {
        ok: false,
        message: `API request failed with status ${response.status}.`,
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
      message:
        error instanceof Error ? error.message : "API request failed.",
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
