import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common"
import {
  authChangePasswordSchema,
  authLoginSchema,
  authRegisterSchema,
  authRequestPasswordResetSchema,
  authResetPasswordSchema,
  authVerifyEmailSchema,
} from "@workspace/validation"
import type {
  AuthChangePasswordInput,
  AuthLoginInput,
  AuthRegisterInput,
  AuthRequestPasswordResetInput,
  AuthResetPasswordInput,
  AuthVerifyEmailInput,
} from "@workspace/validation"
import { ZodError } from "zod"

import {
  getChangePasswordRateLimitRules,
  getLoginRateLimitRules,
  getRegisterRateLimitRules,
  getRequestEmailVerificationRateLimitRules,
  getRequestPasswordResetRateLimitRules,
  getResetPasswordRateLimitRules,
  getVerifyEmailRateLimitRules,
  type AuthRateLimitRequest,
} from "./auth-rate-limit.js"
import { BearerAuthGuard } from "./auth.guard.js"
import { AuthService } from "./auth.service.js"
import { CurrentAuth, CurrentAuthToken } from "./current-auth.decorator.js"
import type { CurrentAuthSessionResponse } from "./auth.types.js"
import { RateLimitService } from "../rate-limit/rate-limit.service.js"

@Controller("auth")
export class AuthController {
  constructor(
    @Inject(AuthService)
    private readonly authService: AuthService,
    @Inject(RateLimitService)
    private readonly rateLimitService: RateLimitService
  ) {}

  @Post("register")
  async register(@Body() body: unknown, @Req() request: AuthRateLimitRequest) {
    try {
      const input = authRegisterSchema.parse(body)

      await this.rateLimitService.enforce(
        getRegisterRateLimitRules(input, request)
      )

      return this.authService.register(input)
    } catch (error) {
      throwValidationError(error, "Invalid registration payload.")
    }
  }

  @Post("login")
  async login(@Body() body: unknown, @Req() request: AuthRateLimitRequest) {
    try {
      const input = authLoginSchema.parse(body)

      await this.rateLimitService.enforce(
        getLoginRateLimitRules(input, request)
      )

      return this.authService.login(input)
    } catch (error) {
      throwValidationError(error, "Invalid login payload.")
    }
  }

  @Post("email-verification/verify")
  async verifyEmail(
    @Body() body: unknown,
    @Req() request: AuthRateLimitRequest
  ) {
    try {
      const input = authVerifyEmailSchema.parse(body)

      await this.rateLimitService.enforce(
        getVerifyEmailRateLimitRules(input, request)
      )

      return this.authService.verifyEmail(input)
    } catch (error) {
      throwValidationError(error, "Invalid email verification payload.")
    }
  }

  @Post("password-reset/request")
  async requestPasswordReset(
    @Body() body: unknown,
    @Req() request: AuthRateLimitRequest
  ) {
    try {
      const input = authRequestPasswordResetSchema.parse(body)

      await this.rateLimitService.enforce(
        getRequestPasswordResetRateLimitRules(input, request)
      )

      return this.authService.requestPasswordReset(input)
    } catch (error) {
      throwValidationError(error, "Invalid password reset request payload.")
    }
  }

  @Post("password-reset/confirm")
  async resetPassword(
    @Body() body: unknown,
    @Req() request: AuthRateLimitRequest
  ) {
    try {
      const input = authResetPasswordSchema.parse(body)

      await this.rateLimitService.enforce(
        getResetPasswordRateLimitRules(input, request)
      )

      return this.authService.resetPassword(input)
    } catch (error) {
      throwValidationError(error, "Invalid password reset payload.")
    }
  }

  @UseGuards(BearerAuthGuard)
  @Post("email-verification/request")
  async requestEmailVerification(
    @CurrentAuth() auth: CurrentAuthSessionResponse,
    @Req() request: AuthRateLimitRequest
  ) {
    await this.rateLimitService.enforce(
      getRequestEmailVerificationRateLimitRules(auth.user.id, request)
    )

    return this.authService.requestEmailVerification(auth.user.id)
  }

  @UseGuards(BearerAuthGuard)
  @Post("password/change")
  async changePassword(
    @CurrentAuth() auth: CurrentAuthSessionResponse,
    @Body() body: unknown,
    @Req() request: AuthRateLimitRequest
  ) {
    try {
      const input = authChangePasswordSchema.parse(body)

      await this.rateLimitService.enforce(
        getChangePasswordRateLimitRules(auth.user.id, request)
      )

      return this.authService.changePassword(auth.user.id, input)
    } catch (error) {
      throwValidationError(error, "Invalid password change payload.")
    }
  }

  @UseGuards(BearerAuthGuard)
  @Get("me")
  async me(@CurrentAuth() auth: CurrentAuthSessionResponse) {
    return auth
  }

  @UseGuards(BearerAuthGuard)
  @Post("logout")
  async logout(@CurrentAuthToken() token: string) {
    return this.authService.logout(token)
  }
}

function throwValidationError(error: unknown, message: string): never {
  if (error instanceof ZodError) {
    throw new BadRequestException({
      message,
      issues: error.issues,
    })
  }

  throw error
}

export type RegisterBody = AuthRegisterInput
export type LoginBody = AuthLoginInput
export type VerifyEmailBody = AuthVerifyEmailInput
export type RequestPasswordResetBody = AuthRequestPasswordResetInput
export type ResetPasswordBody = AuthResetPasswordInput
export type ChangePasswordBody = AuthChangePasswordInput
