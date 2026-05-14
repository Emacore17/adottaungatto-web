import {
  BadRequestException,
  Controller,
  Get,
  Inject,
  Query,
  Req,
} from "@nestjs/common"
import {
  placeAutocompleteQuerySchema,
  placeNearbyQuerySchema,
} from "@workspace/validation"
import { ZodError } from "zod"

import { RateLimitService } from "../rate-limit/rate-limit.service.js"
import {
  getPlaceAutocompleteRateLimitRules,
  getPlaceNearbyRateLimitRules,
  type PlacesRateLimitRequest,
} from "./places-rate-limit.js"
import { PlacesService } from "./places.service.js"

@Controller("places")
export class PlacesController {
  constructor(
    @Inject(PlacesService)
    private readonly placesService: PlacesService,
    @Inject(RateLimitService)
    private readonly rateLimitService: RateLimitService
  ) {}

  @Get("autocomplete")
  async autocomplete(
    @Query() query: Record<string, unknown>,
    @Req() request: PlacesRateLimitRequest = {}
  ) {
    try {
      const input = placeAutocompleteQuerySchema.parse(query)

      await this.rateLimitService.enforce(
        getPlaceAutocompleteRateLimitRules(input, request)
      )

      return this.placesService.autocomplete(input)
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException({
          message: "Invalid place autocomplete query.",
          issues: error.issues,
        })
      }

      throw error
    }
  }

  @Get("nearby")
  async nearby(
    @Query() query: Record<string, unknown>,
    @Req() request: PlacesRateLimitRequest = {}
  ) {
    try {
      const input = placeNearbyQuerySchema.parse(query)

      await this.rateLimitService.enforce(
        getPlaceNearbyRateLimitRules(input, request)
      )

      return this.placesService.nearby(input)
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException({
          message: "Invalid place nearby query.",
          issues: error.issues,
        })
      }

      throw error
    }
  }
}
