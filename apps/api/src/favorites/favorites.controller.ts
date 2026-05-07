import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common"
import {
  favoriteListingIdParamSchema,
  favoriteListQuerySchema,
} from "@workspace/validation"
import { ZodError } from "zod"

import type { CurrentAuthSessionResponse } from "../auth/auth.types.js"
import { BearerAuthGuard } from "../auth/auth.guard.js"
import { CurrentAuth } from "../auth/current-auth.decorator.js"
import { FavoritesService } from "./favorites.service.js"

@Controller("favorites")
export class FavoritesController {
  constructor(
    @Inject(FavoritesService)
    private readonly favoritesService: FavoritesService
  ) {}

  @UseGuards(BearerAuthGuard)
  @Get("listings")
  async listListings(
    @CurrentAuth() auth: CurrentAuthSessionResponse,
    @Query() query: Record<string, unknown>
  ) {
    try {
      return this.favoritesService.listFavorites(
        auth.user.id,
        favoriteListQuerySchema.parse(query)
      )
    } catch (error) {
      throwValidationError(error, "Invalid favorite list query.")
    }
  }

  @UseGuards(BearerAuthGuard)
  @Post("listings/:listingId")
  async addListing(
    @CurrentAuth() auth: CurrentAuthSessionResponse,
    @Param() params: Record<string, unknown>
  ) {
    try {
      const { listingId } = favoriteListingIdParamSchema.parse(params)

      return this.favoritesService.addFavorite(auth.user.id, listingId)
    } catch (error) {
      throwValidationError(error, "Invalid favorite listing id.")
    }
  }

  @UseGuards(BearerAuthGuard)
  @Delete("listings/:listingId")
  async removeListing(
    @CurrentAuth() auth: CurrentAuthSessionResponse,
    @Param() params: Record<string, unknown>
  ) {
    try {
      const { listingId } = favoriteListingIdParamSchema.parse(params)

      return this.favoritesService.removeFavorite(auth.user.id, listingId)
    } catch (error) {
      throwValidationError(error, "Invalid favorite listing id.")
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
