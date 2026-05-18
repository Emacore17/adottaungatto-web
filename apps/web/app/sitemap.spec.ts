import { afterEach, describe, expect, it, vi } from "vitest"

describe("sitemap", () => {
  afterEach(() => {
    vi.resetModules()
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it("is empty when search indexing is disabled in a production runtime", async () => {
    vi.stubEnv("APP_ENV", "production")
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://dev.adottaungatto.it")
    vi.stubEnv("SEARCH_INDEXING_ENABLED", "false")
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("sitemap should not fetch listings when disabled")
      })
    )
    vi.resetModules()

    const { default: sitemap } = await import("./sitemap")

    await expect(sitemap()).resolves.toEqual([])
  })
})
