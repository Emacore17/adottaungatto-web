import { createParamDecorator, UnauthorizedException } from "@nestjs/common"
import type { ExecutionContext } from "@nestjs/common"

import type { AuthenticatedRequest } from "./auth.guard.js"
import type { CurrentAuthSessionResponse } from "./auth.types.js"

export const CurrentAuth = createParamDecorator(
  (_data: unknown, context: ExecutionContext): CurrentAuthSessionResponse => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>()

    if (!request.auth) {
      throw new UnauthorizedException("Authenticated session required.")
    }

    return request.auth
  }
)

export const CurrentAuthToken = createParamDecorator(
  (_data: unknown, context: ExecutionContext): string => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>()

    if (!request.authToken) {
      throw new UnauthorizedException("Authenticated session required.")
    }

    return request.authToken
  }
)
