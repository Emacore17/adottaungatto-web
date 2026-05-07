import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common"
import {
  moderationCaseIdParamSchema,
  moderationDecisionSchema,
  paginationQuerySchema,
} from "@workspace/validation"
import { ZodError } from "zod"

import { BearerAuthGuard } from "../auth/auth.guard.js"
import { CurrentAuth } from "../auth/current-auth.decorator.js"
import type { CurrentAuthSessionResponse } from "../auth/auth.types.js"
import { ModerationService } from "./moderation.service.js"

@Controller("moderation")
export class ModerationController {
  constructor(
    @Inject(ModerationService)
    private readonly moderationService: ModerationService
  ) {}

  @UseGuards(BearerAuthGuard)
  @Get("listings/pending-review")
  async pendingReviewQueue(
    @CurrentAuth() auth: CurrentAuthSessionResponse,
    @Query() query: Record<string, unknown>
  ) {
    try {
      return this.moderationService.pendingReviewQueue(
        auth.user.id,
        paginationQuerySchema.parse(query)
      )
    } catch (error) {
      throwValidationError(error, "Invalid moderation queue query.")
    }
  }

  @UseGuards(BearerAuthGuard)
  @Get("listings/reported")
  async reportedListingsQueue(
    @CurrentAuth() auth: CurrentAuthSessionResponse,
    @Query() query: Record<string, unknown>
  ) {
    try {
      return this.moderationService.reportedListingsQueue(
        auth.user.id,
        paginationQuerySchema.parse(query)
      )
    } catch (error) {
      throwValidationError(error, "Invalid reported listings queue query.")
    }
  }

  @UseGuards(BearerAuthGuard)
  @Post("listings/cases/:caseId/approve")
  async approveListingCase(
    @CurrentAuth() auth: CurrentAuthSessionResponse,
    @Param() params: Record<string, unknown>,
    @Body() body: unknown
  ) {
    try {
      const { caseId } = moderationCaseIdParamSchema.parse(params)

      return this.moderationService.decideListingCase(
        auth.user.id,
        caseId,
        "approve",
        moderationDecisionSchema.parse(body)
      )
    } catch (error) {
      throwValidationError(error, "Invalid moderation decision payload.")
    }
  }

  @UseGuards(BearerAuthGuard)
  @Post("listings/cases/:caseId/reject")
  async rejectListingCase(
    @CurrentAuth() auth: CurrentAuthSessionResponse,
    @Param() params: Record<string, unknown>,
    @Body() body: unknown
  ) {
    try {
      const { caseId } = moderationCaseIdParamSchema.parse(params)

      return this.moderationService.decideListingCase(
        auth.user.id,
        caseId,
        "reject",
        moderationDecisionSchema.parse(body)
      )
    } catch (error) {
      throwValidationError(error, "Invalid moderation decision payload.")
    }
  }

  @UseGuards(BearerAuthGuard)
  @Post("listings/cases/:caseId/suspend")
  async suspendListingCase(
    @CurrentAuth() auth: CurrentAuthSessionResponse,
    @Param() params: Record<string, unknown>,
    @Body() body: unknown
  ) {
    try {
      const { caseId } = moderationCaseIdParamSchema.parse(params)

      return this.moderationService.decideListingCase(
        auth.user.id,
        caseId,
        "suspend",
        moderationDecisionSchema.parse(body)
      )
    } catch (error) {
      throwValidationError(error, "Invalid moderation decision payload.")
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
