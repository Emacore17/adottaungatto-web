import { Module } from "@nestjs/common"

import { DatabaseModule } from "../database/database.module.js"
import { ListingSearchDocumentsService } from "./listing-search-documents.service.js"

@Module({
  imports: [DatabaseModule],
  providers: [ListingSearchDocumentsService],
  exports: [ListingSearchDocumentsService],
})
export class ListingSearchDocumentsModule {}
