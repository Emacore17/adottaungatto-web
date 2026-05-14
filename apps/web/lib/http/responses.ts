import { NextResponse } from "next/server"

export const privateNoStoreCacheControl = "private, no-store, max-age=0"

export function privateJson<TBody>(body: TBody, init: ResponseInit = {}) {
  const headers = new Headers(init.headers)

  headers.set("Cache-Control", privateNoStoreCacheControl)

  return NextResponse.json(body, {
    ...init,
    headers,
  })
}
