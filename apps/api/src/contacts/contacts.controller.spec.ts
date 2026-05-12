import { BadRequestException } from "@nestjs/common"
import { describe, expect, it, vi } from "vitest"

import type { CurrentAuthSessionResponse } from "../auth/auth.types.js"
import { ContactsController } from "./contacts.controller.js"
import type { ContactsService } from "./contacts.service.js"

describe("ContactsController", () => {
  it("validates the received contact request list query and delegates", async () => {
    const contactsService = {
      listReceivedContactRequests: vi.fn().mockResolvedValue({
        items: [],
        meta: {
          page: 1,
          pageSize: 10,
          total: 0,
          totalPages: 0,
        },
      }),
    } as unknown as ContactsService
    const controller = new ContactsController(contactsService)

    await expect(
      controller.listReceivedContactRequests(createAuth(), {
        page: "1",
        pageSize: "10",
      })
    ).resolves.toEqual({
      items: [],
      meta: {
        page: 1,
        pageSize: 10,
        total: 0,
        totalPages: 0,
      },
    })
    expect(contactsService.listReceivedContactRequests).toHaveBeenCalledWith(
      "requester-id",
      {
        page: 1,
        pageSize: 10,
      }
    )
  })

  it("validates params and payload before contacting the owner", async () => {
    const contactsService = {
      contactListingOwner: vi.fn().mockResolvedValue({
        sent: true,
        request: {
          id: "request-id",
        },
      }),
    } as unknown as ContactsService
    const controller = new ContactsController(contactsService)

    await expect(
      controller.contactListingOwner(
        createAuth(),
        {
          listingId: "8f0c4a61-632d-4ed1-a1df-8c4f2ec6fc75",
        },
        {
          message: "Ciao, vorrei avere informazioni sulla gatta.",
          shareEmail: true,
        }
      )
    ).resolves.toEqual({
      sent: true,
      request: {
        id: "request-id",
      },
    })
    expect(contactsService.contactListingOwner).toHaveBeenCalledWith(
      createAuth().user,
      "8f0c4a61-632d-4ed1-a1df-8c4f2ec6fc75",
      {
        message: "Ciao, vorrei avere informazioni sulla gatta.",
        shareEmail: true,
      }
    )
  })

  it("rejects invalid payloads", async () => {
    const contactsService = {
      contactListingOwner: vi.fn(),
    } as unknown as ContactsService
    const controller = new ContactsController(contactsService)

    await expect(
      controller.contactListingOwner(
        createAuth(),
        {
          listingId: "8f0c4a61-632d-4ed1-a1df-8c4f2ec6fc75",
        },
        {
          message: "troppo breve",
          shareEmail: false,
        }
      )
    ).rejects.toBeInstanceOf(BadRequestException)
    expect(contactsService.contactListingOwner).not.toHaveBeenCalled()
  })
})

function createAuth(): CurrentAuthSessionResponse {
  return {
    user: {
      id: "requester-id",
      email: "requester@example.com",
      displayName: "Requester",
      profileType: "private",
      status: "active",
    },
    session: {
      id: "session-id",
      expiresAt: "2026-04-01T12:00:00.000Z",
    },
  }
}
