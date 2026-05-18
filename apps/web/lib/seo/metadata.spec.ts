import { afterEach, describe, expect, it, vi } from "vitest"

describe("createPageMetadata", () => {
  afterEach(() => {
    vi.resetModules()
    vi.unstubAllEnvs()
  })

  it("marks pages as noindex when search indexing is disabled", async () => {
    vi.stubEnv("APP_ENV", "production")
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://dev.adottaungatto.it")
    vi.stubEnv("SEARCH_INDEXING_ENABLED", "false")
    vi.resetModules()

    const { createPageMetadata } = await import("./metadata")

    expect(createPageMetadata().robots).toEqual({
      index: false,
      follow: false,
    })
  })
})
