import { Inject, Injectable } from "@nestjs/common"
import {
  refreshListingSearchDocumentSql,
  type ListingSearchDocumentRefreshRow,
} from "@workspace/db"

import { DatabaseService } from "../database/database.service.js"

export type ListingSearchDocumentRefreshResult = {
  listingId: string
  found: boolean
  indexed: boolean
  deleted: boolean
}

@Injectable()
export class ListingSearchDocumentsService {
  constructor(
    @Inject(DatabaseService)
    private readonly databaseService: DatabaseService
  ) {}

  async refreshListing(
    listingId: string
  ): Promise<ListingSearchDocumentRefreshResult> {
    const [row] =
      await this.databaseService.queryRows<ListingSearchDocumentRefreshRow>(
        refreshListingSearchDocumentSql,
        [listingId]
      )

    return mapRefreshRow(
      row ?? {
        listing_id: listingId,
        found: false,
        indexed: false,
        deleted: false,
      }
    )
  }
}

function mapRefreshRow(
  row: ListingSearchDocumentRefreshRow
): ListingSearchDocumentRefreshResult {
  return {
    listingId: row.listing_id,
    found: row.found,
    indexed: row.indexed,
    deleted: row.deleted,
  }
}
