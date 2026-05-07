import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  Patch,
  UseGuards,
} from "@nestjs/common"
import {
  userNotificationPreferencesUpdateSchema,
  userProfileUpdateSchema,
} from "@workspace/validation"
import { ZodError } from "zod"

import { BearerAuthGuard } from "../auth/auth.guard.js"
import { CurrentAuth } from "../auth/current-auth.decorator.js"
import type { CurrentAuthSessionResponse } from "../auth/auth.types.js"
import { UsersService } from "./users.service.js"

@Controller("users")
export class UsersController {
  constructor(
    @Inject(UsersService)
    private readonly usersService: UsersService
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
}
