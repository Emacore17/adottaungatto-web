import { afterEach, describe, expect, it, vi } from "vitest"

describe("robots", () => {
  afterEach(() => {
    vi.resetModules()
    vi.unstubAllEnvs()
  })

  it("disallows crawlers when search indexing is disabled in a production runtime", async () => {
    vi.stubEnv("APP_ENV", "production")
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://dev.adottaungatto.it")
    vi.stubEnv("SEARCH_INDEXING_ENABLED", "false")
    vi.resetModules()

    const { default: robots } = await import("./robots")

    expect(robots()).toEqual({
      rules: {
        userAgent: "*",
        disallow: "/",
      },
    })
  })
})
