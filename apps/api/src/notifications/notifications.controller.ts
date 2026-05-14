import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Post,
  Query,
  Sse,
  UseGuards,
  type MessageEvent,
} from "@nestjs/common"
import {
  notificationIdParamSchema,
  notificationListQuerySchema,
} from "@workspace/validation"
import type { Observable } from "rxjs"
import { ZodError } from "zod"

import type { CurrentAuthSessionResponse } from "../auth/auth.types.js"
import { BearerAuthGuard } from "../auth/auth.guard.js"
import { CurrentAuth } from "../auth/current-auth.decorator.js"
import { NotificationsService } from "./notifications.service.js"

@Controller("notifications")
export class NotificationsController {
  constructor(
    @Inject(NotificationsService)
    private readonly notificationsService: NotificationsService
  ) {}

  @UseGuards(BearerAuthGuard)
  @Get()
  async list(
    @CurrentAuth() auth: CurrentAuthSessionResponse,
    @Query() query: Record<string, unknown>
  ) {
    try {
      return this.notificationsService.list(
        auth.user.id,
        notificationListQuerySchema.parse(query)
      )
    } catch (error) {
      throwValidationError(error, "Invalid notification list query.")
    }
  }

  @UseGuards(BearerAuthGuard)
  @Get("unread-count")
  async unreadCount(@CurrentAuth() auth: CurrentAuthSessionResponse) {
    return this.notificationsService.unreadCount(auth.user.id)
  }

  @UseGuards(BearerAuthGuard)
  @Sse("stream")
  stream(
    @CurrentAuth() auth: CurrentAuthSessionResponse
  ): Observable<MessageEvent> {
    return this.notificationsService.stream(auth.user.id)
  }

  @UseGuards(BearerAuthGuard)
  @Post(":notificationId/read")
  async markRead(
    @CurrentAuth() auth: CurrentAuthSessionResponse,
    @Param() params: Record<string, unknown>
  ) {
    try {
      const { notificationId } = notificationIdParamSchema.parse(params)

      return this.notificationsService.markRead(auth.user.id, notificationId)
    } catch (error) {
      throwValidationError(error, "Invalid notification id.")
    }
  }

  @UseGuards(BearerAuthGuard)
  @Delete(":notificationId")
  async delete(
    @CurrentAuth() auth: CurrentAuthSessionResponse,
    @Param() params: Record<string, unknown>
  ) {
    try {
      const { notificationId } = notificationIdParamSchema.parse(params)

      return this.notificationsService.delete(auth.user.id, notificationId)
    } catch (error) {
      throwValidationError(error, "Invalid notification id.")
    }
  }

  @UseGuards(BearerAuthGuard)
  @Post("read-all")
  async markAllRead(@CurrentAuth() auth: CurrentAuthSessionResponse) {
    return this.notificationsService.markAllRead(auth.user.id)
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
