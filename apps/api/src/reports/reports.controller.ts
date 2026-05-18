import {
  BadRequestException,
  Body,
  Controller,
  Inject,
  Param,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common"
import {
  listingReportCreateSchema,
  listingReportListingIdParamSchema,
} from "@workspace/validation"
import { ZodError } from "zod"

import type { CurrentAuthSessionResponse } from "../auth/auth.types.js"
import { BearerAuthGuard } from "../auth/auth.guard.js"
import { CurrentAuth } from "../auth/current-auth.decorator.js"
import { RateLimitService } from "../rate-limit/rate-limit.service.js"
import {
  getListingReportRateLimitRules,
  type ReportsRateLimitRequest,
} from "./reports-rate-limit.js"
import { ReportsService } from "./reports.service.js"

@Controller("reports")
export class ReportsController {
  constructor(
    @Inject(ReportsService)
    private readonly reportsService: ReportsService,
    @Inject(RateLimitService)
    private readonly rateLimitService: RateLimitService
  ) {}

  @UseGuards(BearerAuthGuard)
  @Post("listings/:listingId")
  async reportListing(
    @CurrentAuth() auth: CurrentAuthSessionResponse,
    @Param() params: Record<string, unknown>,
    @Body() body: unknown,
    @Req() request: ReportsRateLimitRequest
  ) {
    try {
      const { listingId } = listingReportListingIdParamSchema.parse(params)
      const input = listingReportCreateSchema.parse(body)

      await this.rateLimitService.enforce(
        getListingReportRateLimitRules(auth.user.id, listingId, request)
      )

      return this.reportsService.reportListing(
        auth.user.id,
        listingId,
        input
      )
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException({
          message: "Invalid listing report payload.",
          issues: error.issues,
        })
      }

      throw error
    }
  }
}
