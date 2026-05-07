import {
  BadRequestException,
  Body,
  Controller,
  Inject,
  Param,
  Post,
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
import { ReportsService } from "./reports.service.js"

@Controller("reports")
export class ReportsController {
  constructor(
    @Inject(ReportsService)
    private readonly reportsService: ReportsService
  ) {}

  @UseGuards(BearerAuthGuard)
  @Post("listings/:listingId")
  async reportListing(
    @CurrentAuth() auth: CurrentAuthSessionResponse,
    @Param() params: Record<string, unknown>,
    @Body() body: unknown
  ) {
    try {
      const { listingId } = listingReportListingIdParamSchema.parse(params)

      return this.reportsService.reportListing(
        auth.user.id,
        listingId,
        listingReportCreateSchema.parse(body)
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
