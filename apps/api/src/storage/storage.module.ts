import { Module } from "@nestjs/common"

import { ConfigModule } from "../config/config.module.js"
import { ObjectStorageService } from "./object-storage.service.js"

@Module({
  imports: [ConfigModule],
  providers: [ObjectStorageService],
  exports: [ObjectStorageService],
})
export class StorageModule {}
