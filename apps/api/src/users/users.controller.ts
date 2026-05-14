import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Patch,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common"
import {
  userAccountPasswordConfirmationSchema,
  userNotificationPreferencesUpdateSchema,
  userPhoneVerificationConfirmSchema,
  userProfileUpdateSchema,
} from "@workspace/validation"
import { ZodError } from "zod"

import { BearerAuthGuard } from "../auth/auth.guard.js"
import { CurrentAuth } from "../auth/current-auth.decorator.js"
import type { CurrentAuthSessionResponse } from "../auth/auth.types.js"
import { RateLimitService } from "../rate-limit/rate-limit.service.js"
import {
  getAccountDangerZoneRateLimitRules,
  getConfirmPhoneVerificationRateLimitRules,
  getRequestPhoneVerificationRateLimitRules,
  type UsersRateLimitRequest,
} from "./users-rate-limit.js"
import { UsersService } from "./users.service.js"

@Controller("users")
export class UsersController {
  constructor(
    @Inject(UsersService)
    private readonly usersService: UsersService,
    @Inject(RateLimitService)
    private readonly rateLimitService: RateLimitService
  ) {}

  @UseGuards(BearerAuthGuard)
  @Get("me")
  async me(@CurrentAuth() auth: CurrentAuthSessionResponse) {
    return this.usersService.currentProfile(auth.user.id)
  }

  @UseGuards(BearerAuthGuard)
  @Patch("me")
  async updateMe(
    @CurrentAuth() auth: CurrentAuthSessionResponse,
    @Body() body: unknown
  ) {
    try {
      return this.usersService.updateCurrentProfile(
        auth.user.id,
        userProfileUpdateSchema.parse(body)
      )
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException({
          message: "Invalid user profile update payload.",
          issues: error.issues,
        })
      }

      throw error
    }
  }

  @UseGuards(BearerAuthGuard)
  @Get("me/notification-preferences")
  async notificationPreferences(
    @CurrentAuth() auth: CurrentAuthSessionResponse
  ) {
    return this.usersService.currentNotificationPreferences(auth.user.id)
  }

  @UseGuards(BearerAuthGuard)
  @Patch("me/notification-preferences")
  async updateNotificationPreferences(
    @CurrentAuth() auth: CurrentAuthSessionResponse,
    @Body() body: unknown
  ) {
    try {
      return this.usersService.updateCurrentNotificationPreferences(
        auth.user.id,
        userNotificationPreferencesUpdateSchema.parse(body)
      )
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException({
          message: "Invalid notification preferences payload.",
          issues: error.issues,
        })
      }

      throw error
    }
  }

  @UseGuards(BearerAuthGuard)
  @Post("me/phone-verification/request")
  async requestPhoneVerification(
    @CurrentAuth() auth: CurrentAuthSessionResponse,
    @Req() request: UsersRateLimitRequest
  ) {
    await this.rateLimitService.enforce(
      getRequestPhoneVerificationRateLimitRules(auth.user.id, request)
    )

    return this.usersService.requestPhoneVerification(auth.user.id)
  }

  @UseGuards(BearerAuthGuard)
  @Post("me/phone-verification/confirm")
  async confirmPhoneVerification(
    @CurrentAuth() auth: CurrentAuthSessionResponse,
    @Body() body: unknown,
    @Req() request: UsersRateLimitRequest
  ) {
    try {
      const input = userPhoneVerificationConfirmSchema.parse(body)

      await this.rateLimitService.enforce(
        getConfirmPhoneVerificationRateLimitRules(auth.user.id, request)
      )

      return this.usersService.confirmPhoneVerification(auth.user.id, input)
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException({
          message: "Invalid phone verification payload.",
          issues: error.issues,
        })
      }

      throw error
    }
  }

  @UseGuards(BearerAuthGuard)
  @Post("me/deactivate")
  async deactivateMe(
    @CurrentAuth() auth: CurrentAuthSessionResponse,
    @Body() body: unknown,
    @Req() request: UsersRateLimitRequest
  ) {
    try {
      const input = userAccountPasswordConfirmationSchema.parse(body)

      await this.rateLimitService.enforce(
        getAccountDangerZoneRateLimitRules(auth.user.id, request)
      )

      return this.usersService.deactivateCurrentAccount(auth.user.id, input)
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException({
          message: "Invalid account deactivation payload.",
          issues: error.issues,
        })
      }

      throw error
    }
  }

  @UseGuards(BearerAuthGuard)
  @Delete("me")
  async deleteMe(
    @CurrentAuth() auth: CurrentAuthSessionResponse,
    @Body() body: unknown,
    @Req() request: UsersRateLimitRequest
  ) {
    try {
      const input = userAccountPasswordConfirmationSchema.parse(body)

      await this.rateLimitService.enforce(
        getAccountDangerZoneRateLimitRules(auth.user.id, request)
      )

      return this.usersService.deleteCurrentAccount(auth.user.id, input)
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException({
          message: "Invalid account deletion payload.",
          issues: error.issues,
        })
      }

      throw error
    }
  }
}
