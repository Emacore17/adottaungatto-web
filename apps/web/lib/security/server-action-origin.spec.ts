import { afterEach, describe, expect, it, vi } from "vitest"

describe("server action origin trust", () => {
  afterEach(() => {
    vi.resetModules()
    vi.unstubAllEnvs()
  })

  it("trusts configured admin hosts as first-party action origins", async () => {
    vi.stubEnv("APP_ENV", "production")
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://dev.adottaungatto.it")
    vi.stubEnv("ADMIN_ALLOWED_HOSTS", "admin-dev.adottaungatto.it")
    vi.stubEnv("TRUSTED_ACTION_ORIGINS", "")
    vi.resetModules()

    const { isTrustedRequestOrigin } = await import("./server-action-origin")

    expect(
      isTrustedRequestOrigin(
        new Request("https://admin-dev.adottaungatto.it/login", {
          headers: {
            origin: "https://admin-dev.adottaungatto.it",
          },
        })
      )
    ).toBe(true)
  })
})
