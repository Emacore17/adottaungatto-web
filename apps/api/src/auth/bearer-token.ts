import { UnauthorizedException } from "@nestjs/common"

export function getBearerToken(authorization?: string | string[]): string {
  const header = Array.isArray(authorization) ? authorization[0] : authorization
  const [scheme, token, extra] = header?.trim().split(/\s+/) ?? []

  if (scheme?.toLowerCase() !== "bearer" || !token || extra) {
    throw new UnauthorizedException("Bearer token required.")
  }

  return token
}
