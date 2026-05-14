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
  Req,
  UseGuards,
} from "@nestjs/common"
import {
  listingDraftCreateSchema,
  listingDraftIdParamSchema,
  listingDraftListQuerySchema,
  listingDraftUpdateSchema,
  listingImageIdParamSchema,
  listingImageOrderSchema,
  listingImageUploadRequestSchema,
  listingPhoneVerificationConfirmSchema,
  listingPublicIdParamSchema,
  listingPublicListQuerySchema,
} from "@workspace/validation"
import { ZodError } from "zod"

import { BearerAuthGuard } from "../auth/auth.guard.js"
import { CurrentAuth } from "../auth/current-auth.decorator.js"
import type { CurrentAuthSessionResponse } from "../auth/auth.types.js"
import { RateLimitService } from "../rate-limit/rate-limit.service.js"
import {
  getConfirmDraftImageUploadRateLimitRules,
  getConfirmDraftPhoneVerificationRateLimitRules,
  getCreateDraftImageUploadRateLimitRules,
  getListPublicListingsRateLimitRules,
  getRequestDraftPhoneVerificationRateLimitRules,
  type ListingsRateLimitRequest,
} from "./listings-rate-limit.js"
import { ListingsService } from "./listings.service.js"

@Controller("listings")
export class ListingsController {
  constructor(
    @Inject(ListingsService)
    private readonly listingsService: ListingsService,
    @Inject(RateLimitService)
    private readonly rateLimitService: RateLimitService
  ) {}

  @Get()
  async listPublic(
    @Query() query: Record<string, unknown>,
    @Req() request: ListingsRateLimitRequest = {}
  ) {
    try {
      const input = listingPublicListQuerySchema.parse(query)

      await this.rateLimitService.enforce(
        getListPublicListingsRateLimitRules(input, request)
      )

      return this.listingsService.listPublic(input)
    } catch (error) {
      throwValidationError(error, "Invalid public listing query.")
    }
  }

  @Get("breeds")
  async listPublicBreeds() {
    return this.listingsService.listPublicCatBreeds()
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
  @Get("me/drafts/:id/images")
  async listDraftImages(
    @CurrentAuth() auth: CurrentAuthSessionResponse,
    @Param() params: Record<string, unknown>
  ) {
    try {
      const { id } = listingDraftIdParamSchema.parse(params)

      return this.listingsService.listDraftImages(auth.user.id, id)
    } catch (error) {
      throwValidationError(error, "Invalid listing draft id.")
    }
  }

  @UseGuards(BearerAuthGuard)
  @Post("me/drafts/:id/images/upload-url")
  async createDraftImageUpload(
    @CurrentAuth() auth: CurrentAuthSessionResponse,
    @Param() params: Record<string, unknown>,
    @Body() body: unknown,
    @Req() request: ListingsRateLimitRequest
  ) {
    try {
      const { id } = listingDraftIdParamSchema.parse(params)
      const input = listingImageUploadRequestSchema.parse(body)

      await this.rateLimitService.enforce(
        getCreateDraftImageUploadRateLimitRules(auth.user.id, id, request)
      )

      return this.listingsService.createDraftImageUpload(
        auth.user.id,
        id,
        input
      )
    } catch (error) {
      throwValidationError(error, "Invalid listing image upload payload.")
    }
  }

  @UseGuards(BearerAuthGuard)
  @Post("me/drafts/:id/images/:imageId/confirm")
  async confirmDraftImageUpload(
    @CurrentAuth() auth: CurrentAuthSessionResponse,
    @Param() params: Record<string, unknown>,
    @Req() request: ListingsRateLimitRequest
  ) {
    try {
      const { id } = listingDraftIdParamSchema.parse(params)
      const { id: imageId } = listingDraftIdParamSchema.parse({
        id: params.imageId,
      })

      await this.rateLimitService.enforce(
        getConfirmDraftImageUploadRateLimitRules(
          auth.user.id,
          id,
          imageId,
          request
        )
      )

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
  @Patch("me/drafts/:id/images/order")
  async reorderDraftImages(
    @CurrentAuth() auth: CurrentAuthSessionResponse,
    @Param() params: Record<string, unknown>,
    @Body() body: unknown
  ) {
    try {
      const { id } = listingDraftIdParamSchema.parse(params)

      return this.listingsService.reorderDraftImages(
        auth.user.id,
        id,
        listingImageOrderSchema.parse(body)
      )
    } catch (error) {
      throwValidationError(error, "Invalid listing image order payload.")
    }
  }

  @UseGuards(BearerAuthGuard)
  @Patch("me/drafts/:id/images/:imageId/cover")
  async setDraftImageCover(
    @CurrentAuth() auth: CurrentAuthSessionResponse,
    @Param() params: Record<string, unknown>
  ) {
    try {
      const { id } = listingDraftIdParamSchema.parse(params)
      const { imageId } = listingImageIdParamSchema.parse(params)

      return this.listingsService.setDraftImageCover(auth.user.id, id, imageId)
    } catch (error) {
      throwValidationError(error, "Invalid listing image id.")
    }
  }

  @UseGuards(BearerAuthGuard)
  @Delete("me/drafts/:id/images/:imageId")
  async deleteDraftImage(
    @CurrentAuth() auth: CurrentAuthSessionResponse,
    @Param() params: Record<string, unknown>
  ) {
    try {
      const { id } = listingDraftIdParamSchema.parse(params)
      const { imageId } = listingImageIdParamSchema.parse(params)

      return this.listingsService.deleteDraftImage(auth.user.id, id, imageId)
    } catch (error) {
      throwValidationError(error, "Invalid listing image id.")
    }
  }

  @UseGuards(BearerAuthGuard)
  @Post("me/drafts/:id/phone-verification/request")
  async requestDraftPhoneVerification(
    @CurrentAuth() auth: CurrentAuthSessionResponse,
    @Param() params: Record<string, unknown>,
    @Req() request: ListingsRateLimitRequest
  ) {
    try {
      const { id } = listingDraftIdParamSchema.parse(params)

      await this.rateLimitService.enforce(
        getRequestDraftPhoneVerificationRateLimitRules(
          auth.user.id,
          id,
          request
        )
      )

      return this.listingsService.requestDraftPhoneVerification(
        auth.user.id,
        id
      )
    } catch (error) {
      throwValidationError(error, "Invalid listing draft id.")
    }
  }

  @UseGuards(BearerAuthGuard)
  @Post("me/drafts/:id/phone-verification/confirm")
  async confirmDraftPhoneVerification(
    @CurrentAuth() auth: CurrentAuthSessionResponse,
    @Param() params: Record<string, unknown>,
    @Body() body: unknown,
    @Req() request: ListingsRateLimitRequest
  ) {
    try {
      const { id } = listingDraftIdParamSchema.parse(params)
      const input = listingPhoneVerificationConfirmSchema.parse(body)

      await this.rateLimitService.enforce(
        getConfirmDraftPhoneVerificationRateLimitRules(
          auth.user.id,
          id,
          request
        )
      )

      return this.listingsService.confirmDraftPhoneVerification(
        auth.user.id,
        id,
        input
      )
    } catch (error) {
      throwValidationError(error, "Invalid listing phone verification payload.")
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
