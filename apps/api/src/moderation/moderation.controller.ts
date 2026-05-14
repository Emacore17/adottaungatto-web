import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common"
import {
  moderationCaseIdParamSchema,
  moderationCommentSchema,
  moderationDecisionSchema,
  paginationQuerySchema,
} from "@workspace/validation"
import { ZodError } from "zod"

import { BearerAuthGuard } from "../auth/auth.guard.js"
import { CurrentAuth } from "../auth/current-auth.decorator.js"
import type { CurrentAuthSessionResponse } from "../auth/auth.types.js"
import { RequireRoles } from "../auth/roles.decorator.js"
import { RolesGuard } from "../auth/roles.guard.js"
import { RateLimitService } from "../rate-limit/rate-limit.service.js"
import {
  getModerationClaimRateLimitRules,
  getModerationCommentRateLimitRules,
  getModerationDecisionRateLimitRules,
  getModerationQueueRateLimitRules,
  type ModerationRateLimitRequest,
} from "./moderation-rate-limit.js"
import { ModerationService } from "./moderation.service.js"

@RequireRoles("admin", "moderator")
@UseGuards(BearerAuthGuard, RolesGuard)
@Controller("moderation")
export class ModerationController {
  constructor(
    @Inject(ModerationService)
    private readonly moderationService: ModerationService,
    @Inject(RateLimitService)
    private readonly rateLimitService: RateLimitService
  ) {}

  @Get("listings/pending-review")
  async pendingReviewQueue(
    @CurrentAuth() auth: CurrentAuthSessionResponse,
    @Query() query: Record<string, unknown>,
    @Req() request: ModerationRateLimitRequest
  ) {
    try {
      const input = paginationQuerySchema.parse(query)

      await this.rateLimitService.enforce(
        getModerationQueueRateLimitRules(
          auth.user.id,
          "pending-review",
          request
        )
      )

      return this.moderationService.pendingReviewQueue(auth.user.id, input)
    } catch (error) {
      throwValidationError(error, "Invalid moderation queue query.")
    }
  }

  @Get("listings/reported")
  async reportedListingsQueue(
    @CurrentAuth() auth: CurrentAuthSessionResponse,
    @Query() query: Record<string, unknown>,
    @Req() request: ModerationRateLimitRequest
  ) {
    try {
      const input = paginationQuerySchema.parse(query)

      await this.rateLimitService.enforce(
        getModerationQueueRateLimitRules(auth.user.id, "reported", request)
      )

      return this.moderationService.reportedListingsQueue(auth.user.id, input)
    } catch (error) {
      throwValidationError(error, "Invalid reported listings queue query.")
    }
  }

  @Get("listings/actions/recent")
  async recentListingActions(
    @CurrentAuth() auth: CurrentAuthSessionResponse,
    @Query() query: Record<string, unknown>,
    @Req() request: ModerationRateLimitRequest
  ) {
    try {
      const input = paginationQuerySchema.parse(query)

      await this.rateLimitService.enforce(
        getModerationQueueRateLimitRules(
          auth.user.id,
          "recent-actions",
          request
        )
      )

      return this.moderationService.recentListingActions(auth.user.id, input)
    } catch (error) {
      throwValidationError(error, "Invalid recent moderation actions query.")
    }
  }

  @Post("listings/cases/:caseId/approve")
  async approveListingCase(
    @CurrentAuth() auth: CurrentAuthSessionResponse,
    @Param() params: Record<string, unknown>,
    @Body() body: unknown,
    @Req() request: ModerationRateLimitRequest
  ) {
    try {
      const { caseId } = moderationCaseIdParamSchema.parse(params)
      const input = moderationDecisionSchema.parse(body)

      await this.rateLimitService.enforce(
        getModerationDecisionRateLimitRules(
          auth.user.id,
          caseId,
          "approve",
          request
        )
      )

      return this.moderationService.decideListingCase(
        auth.user.id,
        caseId,
        "approve",
        input
      )
    } catch (error) {
      throwValidationError(error, "Invalid moderation decision payload.")
    }
  }

  @Post("listings/cases/:caseId/claim")
  async claimListingCase(
    @CurrentAuth() auth: CurrentAuthSessionResponse,
    @Param() params: Record<string, unknown>,
    @Req() request: ModerationRateLimitRequest
  ) {
    try {
      const { caseId } = moderationCaseIdParamSchema.parse(params)

      await this.rateLimitService.enforce(
        getModerationClaimRateLimitRules(auth.user.id, caseId, request)
      )

      return this.moderationService.claimListingCase(auth.user.id, caseId)
    } catch (error) {
      throwValidationError(error, "Invalid moderation claim payload.")
    }
  }

  @Post("listings/cases/:caseId/comments")
  async commentListingCase(
    @CurrentAuth() auth: CurrentAuthSessionResponse,
    @Param() params: Record<string, unknown>,
    @Body() body: unknown,
    @Req() request: ModerationRateLimitRequest
  ) {
    try {
      const { caseId } = moderationCaseIdParamSchema.parse(params)
      const input = moderationCommentSchema.parse(body)

      await this.rateLimitService.enforce(
        getModerationCommentRateLimitRules(auth.user.id, caseId, request)
      )

      return this.moderationService.commentListingCase(
        auth.user.id,
        caseId,
        input
      )
    } catch (error) {
      throwValidationError(error, "Invalid moderation comment payload.")
    }
  }

  @Post("listings/cases/:caseId/reject")
  async rejectListingCase(
    @CurrentAuth() auth: CurrentAuthSessionResponse,
    @Param() params: Record<string, unknown>,
    @Body() body: unknown,
    @Req() request: ModerationRateLimitRequest
  ) {
    try {
      const { caseId } = moderationCaseIdParamSchema.parse(params)
      const input = moderationDecisionSchema.parse(body)

      await this.rateLimitService.enforce(
        getModerationDecisionRateLimitRules(
          auth.user.id,
          caseId,
          "reject",
          request
        )
      )

      return this.moderationService.decideListingCase(
        auth.user.id,
        caseId,
        "reject",
        input
      )
    } catch (error) {
      throwValidationError(error, "Invalid moderation decision payload.")
    }
  }

  @Post("listings/cases/:caseId/suspend")
  async suspendListingCase(
    @CurrentAuth() auth: CurrentAuthSessionResponse,
    @Param() params: Record<string, unknown>,
    @Body() body: unknown,
    @Req() request: ModerationRateLimitRequest
  ) {
    try {
      const { caseId } = moderationCaseIdParamSchema.parse(params)
      const input = moderationDecisionSchema.parse(body)

      await this.rateLimitService.enforce(
        getModerationDecisionRateLimitRules(
          auth.user.id,
          caseId,
          "suspend",
          request
        )
      )

      return this.moderationService.decideListingCase(
        auth.user.id,
        caseId,
        "suspend",
        input
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
