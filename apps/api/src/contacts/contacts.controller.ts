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
  listingContactCreateSchema,
  listingContactListingIdParamSchema,
  listingContactRequestListQuerySchema,
} from "@workspace/validation"
import { ZodError } from "zod"

import type { CurrentAuthSessionResponse } from "../auth/auth.types.js"
import { BearerAuthGuard } from "../auth/auth.guard.js"
import { CurrentAuth } from "../auth/current-auth.decorator.js"
import { ContactsService } from "./contacts.service.js"

@Controller("contacts")
export class ContactsController {
  constructor(
    @Inject(ContactsService)
    private readonly contactsService: ContactsService
  ) {}

  @UseGuards(BearerAuthGuard)
  @Get("me/received")
  async listReceivedContactRequests(
    @CurrentAuth() auth: CurrentAuthSessionResponse,
    @Query() query: Record<string, unknown>
  ) {
    try {
      return this.contactsService.listReceivedContactRequests(
        auth.user.id,
        listingContactRequestListQuerySchema.parse(query)
      )
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException({
          message: "Invalid contact request list query.",
          issues: error.issues,
        })
      }

      throw error
    }
  }

  @UseGuards(BearerAuthGuard)
  @Post("listings/:listingId")
  async contactListingOwner(
    @CurrentAuth() auth: CurrentAuthSessionResponse,
    @Param() params: Record<string, unknown>,
    @Body() body: unknown
  ) {
    try {
      const { listingId } = listingContactListingIdParamSchema.parse(params)

      return this.contactsService.contactListingOwner(
        auth.user,
        listingId,
        listingContactCreateSchema.parse(body)
      )
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException({
          message: "Invalid listing contact payload.",
          issues: error.issues,
        })
      }

      throw error
    }
  }
}
