import {
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
  type CanActivate,
  type ExecutionContext,
} from "@nestjs/common"
import { Reflector } from "@nestjs/core"

import { DatabaseService } from "../database/database.service.js"
import type { AuthenticatedRequest } from "./auth.guard.js"
import {
  requiredRolesMetadataKey,
  type AuthRoleCode,
} from "./roles.decorator.js"

type UserRoleRow = {
  role_code: AuthRoleCode
}

type RoleProtectedRequest = AuthenticatedRequest & {
  authRoles?: AuthRoleCode[]
}

const currentUserRolesSql = `
  select roles.code as role_code
  from user_roles
  join roles on roles.id = user_roles.role_id
  join users on users.id = user_roles.user_id
  where user_roles.user_id = $1::uuid
    and users.deleted_at is null
    and users.status in ('active', 'pending_verification')
`

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    @Inject(Reflector)
    private readonly reflector: Reflector,
    @Inject(DatabaseService)
    private readonly databaseService: DatabaseService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles =
      this.reflector.getAllAndOverride<AuthRoleCode[]>(
        requiredRolesMetadataKey,
        [context.getHandler(), context.getClass()]
      ) ?? []

    if (requiredRoles.length === 0) {
      return true
    }

    const request = context.switchToHttp().getRequest<RoleProtectedRequest>()
    const userId = request.auth?.user.id

    if (!userId) {
      throw new UnauthorizedException("Authenticated session required.")
    }

    const roles = await this.getRequestRoles(request, userId)

    if (roles.some((role) => requiredRoles.includes(role))) {
      return true
    }

    throw new ForbiddenException("Required role missing.")
  }

  private async getRequestRoles(request: RoleProtectedRequest, userId: string) {
    if (request.authRoles) {
      return request.authRoles
    }

    const rows = await this.databaseService.queryRows<UserRoleRow>(
      currentUserRolesSql,
      [userId]
    )
    const roles = rows.map((row) => row.role_code)

    request.authRoles = roles

    return roles
  }
}
