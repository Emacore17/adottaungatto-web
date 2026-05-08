import { Module } from "@nestjs/common"

import { AuthModule } from "../auth/auth.module.js"
import { DatabaseModule } from "../database/database.module.js"
import { ListingSearchDocumentsModule } from "../listing-search-documents/listing-search-documents.module.js"
import { LikesController } from "./likes.controller.js"
import { LikesService } from "./likes.service.js"

@Module({
  imports: [AuthModule, DatabaseModule, ListingSearchDocumentsModule],
  controllers: [LikesController],
  providers: [LikesService],
})
export class LikesModule {}
