import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common"
import { likeListingIdParamSchema } from "@workspace/validation"
import { ZodError } from "zod"

import type { CurrentAuthSessionResponse } from "../auth/auth.types.js"
import { BearerAuthGuard } from "../auth/auth.guard.js"
import { CurrentAuth } from "../auth/current-auth.decorator.js"
import { LikesService } from "./likes.service.js"

@Controller("likes")
export class LikesController {
  constructor(
    @Inject(LikesService)
    private readonly likesService: LikesService
  ) {}

  @Get("listings/:listingId")
  async listingLikeCount(@Param() params: Record<string, unknown>) {
    try {
      const { listingId } = likeListingIdParamSchema.parse(params)

      return this.likesService.publicLikeCount(listingId)
    } catch (error) {
      throwValidationError(error, "Invalid like listing id.")
    }
  }

  @UseGuards(BearerAuthGuard)
  @Post("listings/:listingId")
  async likeListing(
    @CurrentAuth() auth: CurrentAuthSessionResponse,
    @Param() params: Record<string, unknown>
  ) {
    try {
      const { listingId } = likeListingIdParamSchema.parse(params)

      return this.likesService.likeListing(auth.user.id, listingId)
    } catch (error) {
      throwValidationError(error, "Invalid like listing id.")
    }
  }

  @UseGuards(BearerAuthGuard)
  @Delete("listings/:listingId")
  async unlikeListing(
    @CurrentAuth() auth: CurrentAuthSessionResponse,
    @Param() params: Record<string, unknown>
  ) {
    try {
      const { listingId } = likeListingIdParamSchema.parse(params)

      return this.likesService.unlikeListing(auth.user.id, listingId)
    } catch (error) {
      throwValidationError(error, "Invalid like listing id.")
    }
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
