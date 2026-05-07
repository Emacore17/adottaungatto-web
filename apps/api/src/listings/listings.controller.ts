import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common"
import {
  listingDraftCreateSchema,
  listingDraftIdParamSchema,
  listingDraftListQuerySchema,
  listingDraftUpdateSchema,
  listingImageUploadRequestSchema,
  listingPublicIdParamSchema,
  listingPublicListQuerySchema,
} from "@workspace/validation"
import { ZodError } from "zod"

import { BearerAuthGuard } from "../auth/auth.guard.js"
import { CurrentAuth } from "../auth/current-auth.decorator.js"
import type { CurrentAuthSessionResponse } from "../auth/auth.types.js"
import { ListingsService } from "./listings.service.js"

@Controller("listings")
export class ListingsController {
  constructor(
    @Inject(ListingsService)
    private readonly listingsService: ListingsService
  ) {}

  @Get()
  async listPublic(@Query() query: Record<string, unknown>) {
    try {
      return this.listingsService.listPublic(
        listingPublicListQuerySchema.parse(query)
      )
    } catch (error) {
      throwValidationError(error, "Invalid public listing query.")
    }
  }

  @Get(":id")
  async publicDetail(@Param() params: Record<string, unknown>) {
    try {
      const { id } = listingPublicIdParamSchema.parse(params)

      return this.listingsService.publicDetail(id)
    } catch (error) {
      throwValidationError(error, "Invalid public listing id.")
    }
  }

  @UseGuards(BearerAuthGuard)
  @Get("me/drafts")
  async listDrafts(
    @CurrentAuth() auth: CurrentAuthSessionResponse,
    @Query() query: Record<string, unknown>
  ) {
    try {
      return this.listingsService.listDrafts(
        auth.user.id,
        listingDraftListQuerySchema.parse(query)
      )
    } catch (error) {
      throwValidationError(error, "Invalid listing draft query.")
    }
  }

  @UseGuards(BearerAuthGuard)
  @Post("me/drafts")
  async createDraft(
    @CurrentAuth() auth: CurrentAuthSessionResponse,
    @Body() body: unknown
  ) {
    try {
      return this.listingsService.createDraft(
        auth.user.id,
        listingDraftCreateSchema.parse(body)
      )
    } catch (error) {
      throwValidationError(error, "Invalid listing draft payload.")
    }
  }

  @UseGuards(BearerAuthGuard)
  @Post("me/drafts/:id/images/upload-url")
  async createDraftImageUpload(
    @CurrentAuth() auth: CurrentAuthSessionResponse,
    @Param() params: Record<string, unknown>,
    @Body() body: unknown
  ) {
    try {
      const { id } = listingDraftIdParamSchema.parse(params)

      return this.listingsService.createDraftImageUpload(
        auth.user.id,
        id,
        listingImageUploadRequestSchema.parse(body)
      )
    } catch (error) {
      throwValidationError(error, "Invalid listing image upload payload.")
    }
  }

  @UseGuards(BearerAuthGuard)
  @Post("me/drafts/:id/images/:imageId/confirm")
  async confirmDraftImageUpload(
    @CurrentAuth() auth: CurrentAuthSessionResponse,
    @Param() params: Record<string, unknown>
  ) {
    try {
      const { id } = listingDraftIdParamSchema.parse(params)
      const { id: imageId } = listingDraftIdParamSchema.parse({
        id: params.imageId,
      })

      return this.listingsService.confirmDraftImageUpload(
        auth.user.id,
        id,
        imageId
      )
    } catch (error) {
      throwValidationError(error, "Invalid listing image id.")
    }
  }

  @UseGuards(BearerAuthGuard)
  @Post("me/drafts/:id/submit-review")
  async submitDraftForReview(
    @CurrentAuth() auth: CurrentAuthSessionResponse,
    @Param() params: Record<string, unknown>
  ) {
    try {
      const { id } = listingDraftIdParamSchema.parse(params)

      return this.listingsService.submitDraftForReview(auth.user.id, id)
    } catch (error) {
      throwValidationError(error, "Invalid listing draft id.")
    }
  }

  @UseGuards(BearerAuthGuard)
  @Get("me/drafts/:id")
  async draft(
    @CurrentAuth() auth: CurrentAuthSessionResponse,
    @Param() params: Record<string, unknown>
  ) {
    try {
      const { id } = listingDraftIdParamSchema.parse(params)

      return this.listingsService.draft(auth.user.id, id)
    } catch (error) {
      throwValidationError(error, "Invalid listing draft id.")
    }
  }

  @UseGuards(BearerAuthGuard)
  @Patch("me/drafts/:id")
  async updateDraft(
    @CurrentAuth() auth: CurrentAuthSessionResponse,
    @Param() params: Record<string, unknown>,
    @Body() body: unknown
  ) {
    try {
      const { id } = listingDraftIdParamSchema.parse(params)

      return this.listingsService.updateDraft(
        auth.user.id,
        id,
        listingDraftUpdateSchema.parse(body)
      )
    } catch (error) {
      throwValidationError(error, "Invalid listing draft update payload.")
    }
  }

  @UseGuards(BearerAuthGuard)
  @Delete("me/drafts/:id")
  async deleteDraft(
    @CurrentAuth() auth: CurrentAuthSessionResponse,
    @Param() params: Record<string, unknown>
  ) {
    try {
      const { id } = listingDraftIdParamSchema.parse(params)

      return this.listingsService.deleteDraft(auth.user.id, id)
    } catch (error) {
      throwValidationError(error, "Invalid listing draft id.")
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
