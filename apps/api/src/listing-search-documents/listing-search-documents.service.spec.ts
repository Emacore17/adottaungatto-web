import { describe, expect, it, vi } from "vitest"

import type { DatabaseService } from "../database/database.service.js"
import { ListingSearchDocumentsService } from "./listing-search-documents.service.js"

describe("ListingSearchDocumentsService", () => {
  it("refreshes a listing search document", async () => {
    const databaseService = {
      queryRows: vi.fn().mockResolvedValue([
        {
          listing_id: "listing-id",
          found: true,
          indexed: true,
          deleted: false,
        },
      ]),
    } as unknown as DatabaseService
    const service = new ListingSearchDocumentsService(databaseService)

    await expect(service.refreshListing("listing-id")).resolves.toEqual({
      listingId: "listing-id",
      found: true,
      indexed: true,
      deleted: false,
    })
    expect(databaseService.queryRows).toHaveBeenCalledWith(
      expect.stringContaining("listing_search_documents"),
      ["listing-id"]
    )
  })
})
