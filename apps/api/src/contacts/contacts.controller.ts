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
  listingContactCreateSchema,
  listingContactListingIdParamSchema,
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
