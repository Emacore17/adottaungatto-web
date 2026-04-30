import type { ExecutionContext } from "@nestjs/common"
import { UnauthorizedException } from "@nestjs/common"
import { describe, expect, it, vi } from "vitest"

import { BearerAuthGuard } from "./auth.guard.js"
import type { AuthService } from "./auth.service.js"
import { getBearerToken } from "./bearer-token.js"

describe("getBearerToken", () => {
  it("extracts bearer tokens", () => {
    expect(getBearerToken("Bearer clear-token")).toBe("clear-token")
  })

  it("rejects malformed authorization headers", () => {
    expect(() => getBearerToken("Basic clear-token")).toThrow(
      UnauthorizedException
    )
    expect(() => getBearerToken("Bearer clear-token extra")).toThrow(
      UnauthorizedException
    )
    expect(() => getBearerToken()).toThrow(UnauthorizedException)
  })
})

describe("BearerAuthGuard", () => {
  it("loads the current session and attaches it to the request", async () => {
    const auth = {
      user: {
        id: "user-id",
        email: "user@example.com",
        displayName: "Emanuele",
        profileType: "private",
        status: "active",
      },
      session: {
        id: "session-id",
        expiresAt: "2026-05-30T10:00:00.000Z",
      },
    } as const
    const authService = {
      currentSession: vi.fn().mockResolvedValue(auth),
    } as unknown as AuthService
    const guard = new BearerAuthGuard(authService)
    const request = {
      headers: {
        authorization: "Bearer clear-token",
      },
    }

    await expect(guard.canActivate(createContext(request))).resolves.toBe(true)

    expect(authService.currentSession).toHaveBeenCalledWith("clear-token")
    expect(request).toMatchObject({
      auth,
      authToken: "clear-token",
    })
  })
})

function createContext(request: unknown): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as ExecutionContext
}
