import type { ExecutionContext } from "@nestjs/common"
import { ForbiddenException, UnauthorizedException } from "@nestjs/common"
import type { Reflector } from "@nestjs/core"
import { describe, expect, it, vi } from "vitest"

import type { DatabaseService } from "../database/database.service.js"
import { RolesGuard } from "./roles.guard.js"

describe("RolesGuard", () => {
  it("allows requests without required role metadata", async () => {
    const { databaseService, guard } = createGuard([])

    await expect(
      guard.canActivate(createContext({ auth: createAuth() }))
    ).resolves.toBe(true)
    expect(databaseService.queryRows).not.toHaveBeenCalled()
  })

  it("allows authenticated users with one required role", async () => {
    const { databaseService, guard } = createGuard(
      ["admin", "moderator"],
      [{ role_code: "registered_user" }, { role_code: "moderator" }]
    )
    const request = { auth: createAuth() }

    await expect(guard.canActivate(createContext(request))).resolves.toBe(true)
    expect(databaseService.queryRows).toHaveBeenCalledWith(
      expect.stringContaining("from user_roles"),
      ["user-id"]
    )
    expect(request).toMatchObject({
      authRoles: ["registered_user", "moderator"],
    })
  })

  it("rejects authenticated users without a required role", async () => {
    const { guard } = createGuard(["admin"], [{ role_code: "registered_user" }])

    await expect(
      guard.canActivate(createContext({ auth: createAuth() }))
    ).rejects.toBeInstanceOf(ForbiddenException)
  })

  it("rejects requests without an authenticated session", async () => {
    const { guard } = createGuard(["moderator"])

    await expect(guard.canActivate(createContext({}))).rejects.toBeInstanceOf(
      UnauthorizedException
    )
  })
})

function createGuard(
  requiredRoles: string[],
  rows: Array<{ role_code: string }> = []
) {
  const reflector = {
    getAllAndOverride: vi.fn().mockReturnValue(requiredRoles),
  } as unknown as Reflector
  const databaseService = {
    queryRows: vi.fn().mockResolvedValue(rows),
  } as unknown as DatabaseService

  return {
    databaseService,
    guard: new RolesGuard(reflector, databaseService),
  }
}

function createAuth() {
  return {
    user: {
      id: "user-id",
      email: "user@example.com",
      displayName: "User",
      profileType: "private",
      status: "active",
    },
    session: {
      id: "session-id",
      expiresAt: "2026-05-30T10:00:00.000Z",
    },
  }
}

function createContext(request: unknown): ExecutionContext {
  return {
    getClass: () => RolesGuard,
    getHandler: () => createContext,
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as unknown as ExecutionContext
}
