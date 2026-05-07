import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  Post,
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

import { BearerAuthGuard } from "./auth.guard.js"
import { AuthService } from "./auth.service.js"
import { CurrentAuth, CurrentAuthToken } from "./current-auth.decorator.js"
import type { CurrentAuthSessionResponse } from "./auth.types.js"

@Controller("auth")
export class AuthController {
  constructor(
    @Inject(AuthService)
    private readonly authService: AuthService
  ) {}

  @Post("register")
  async register(@Body() body: unknown) {
    try {
      return this.authService.register(authRegisterSchema.parse(body))
    } catch (error) {
      throwValidationError(error, "Invalid registration payload.")
    }
  }

  @Post("login")
  async login(@Body() body: unknown) {
    try {
      return this.authService.login(authLoginSchema.parse(body))
    } catch (error) {
      throwValidationError(error, "Invalid login payload.")
    }
  }

  @Post("email-verification/verify")
  async verifyEmail(@Body() body: unknown) {
    try {
      return this.authService.verifyEmail(authVerifyEmailSchema.parse(body))
    } catch (error) {
      throwValidationError(error, "Invalid email verification payload.")
    }
  }

  @Post("password-reset/request")
  async requestPasswordReset(@Body() body: unknown) {
    try {
      return this.authService.requestPasswordReset(
        authRequestPasswordResetSchema.parse(body)
      )
    } catch (error) {
      throwValidationError(error, "Invalid password reset request payload.")
    }
  }

  @Post("password-reset/confirm")
  async resetPassword(@Body() body: unknown) {
    try {
      return this.authService.resetPassword(authResetPasswordSchema.parse(body))
    } catch (error) {
      throwValidationError(error, "Invalid password reset payload.")
    }
  }

  @UseGuards(BearerAuthGuard)
  @Post("email-verification/request")
  async requestEmailVerification(
    @CurrentAuth() auth: CurrentAuthSessionResponse
  ) {
    return this.authService.requestEmailVerification(auth.user.id)
  }

  @UseGuards(BearerAuthGuard)
  @Post("password/change")
  async changePassword(
    @CurrentAuth() auth: CurrentAuthSessionResponse,
    @Body() body: unknown
  ) {
    try {
      return this.authService.changePassword(
        auth.user.id,
        authChangePasswordSchema.parse(body)
      )
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
