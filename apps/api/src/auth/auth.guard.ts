import type { CanActivate, ExecutionContext } from "@nestjs/common"
import { Inject, Injectable } from "@nestjs/common"

import { AuthService } from "./auth.service.js"
import { getBearerToken } from "./bearer-token.js"
import type { CurrentAuthSessionResponse } from "./auth.types.js"

export type AuthenticatedRequest = {
  auth?: CurrentAuthSessionResponse
  authToken?: string
  headers: {
    authorization?: string | string[]
  }
}

@Injectable()
export class BearerAuthGuard implements CanActivate {
  constructor(
    @Inject(AuthService)
    private readonly authService: AuthService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>()
    const token = getBearerToken(request.headers.authorization)

    request.authToken = token
    request.auth = await this.authService.currentSession(token)

    return true
  }
}
