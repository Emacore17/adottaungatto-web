import {
  BadRequestException,
  Controller,
  Get,
  Inject,
  Query,
} from "@nestjs/common"
import {
  placeAutocompleteQuerySchema,
  placeNearbyQuerySchema,
} from "@workspace/validation"
import { ZodError } from "zod"

import { PlacesService } from "./places.service.js"

@Controller("places")
export class PlacesController {
  constructor(
    @Inject(PlacesService)
    private readonly placesService: PlacesService
  ) {}

  @Get("autocomplete")
  async autocomplete(@Query() query: Record<string, unknown>) {
    try {
      return this.placesService.autocomplete(
        placeAutocompleteQuerySchema.parse(query)
      )
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
  async nearby(@Query() query: Record<string, unknown>) {
    try {
      return this.placesService.nearby(placeNearbyQuerySchema.parse(query))
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
