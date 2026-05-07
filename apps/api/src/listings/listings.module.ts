import { Module } from "@nestjs/common"

import { AuthModule } from "../auth/auth.module.js"
import { DatabaseModule } from "../database/database.module.js"
import { StorageModule } from "../storage/storage.module.js"
import { ListingsController } from "./listings.controller.js"
import { ListingsService } from "./listings.service.js"

@Module({
  imports: [AuthModule, DatabaseModule, StorageModule],
  controllers: [ListingsController],
  providers: [ListingsService],
})
export class ListingsModule {}
