import { afterEach, describe, expect, it, vi } from "vitest"

describe("apiFetch", () => {
  afterEach(() => {
    vi.resetModules()
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it("adds Cloudflare Access service-token headers to server-side API requests when configured", async () => {
    vi.stubEnv("API_INTERNAL_URL", "https://api-dev.adottaungatto.it")
    vi.stubEnv("CLOUDFLARE_ACCESS_CLIENT_ID", "client-id")
    vi.stubEnv("CLOUDFLARE_ACCESS_CLIENT_SECRET", "client-secret")
    const fetchMock = vi.fn<typeof fetch>(async () => {
      return new Response(JSON.stringify({ service: "api" }), {
        headers: {
          "content-type": "application/json",
        },
        status: 200,
      })
    })
    vi.stubGlobal("fetch", fetchMock)
    vi.resetModules()

    const { apiFetch } = await import("./client")

    await apiFetch("/health")

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const init = fetchMock.mock.calls[0]?.[1]
    const headers = new Headers(init?.headers)

    expect(headers.get("CF-Access-Client-Id")).toBe("client-id")
    expect(headers.get("CF-Access-Client-Secret")).toBe("client-secret")
  })
})
