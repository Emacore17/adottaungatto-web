import { Module } from "@nestjs/common"

import { AuthModule } from "../auth/auth.module.js"
import { ConfigModule } from "../config/config.module.js"
import { DatabaseModule } from "../database/database.module.js"
import { NotificationsModule } from "../notifications/notifications.module.js"
import { RateLimitModule } from "../rate-limit/rate-limit.module.js"
import { StorageModule } from "../storage/storage.module.js"
import { ListingsController } from "./listings.controller.js"
import { ListingsService } from "./listings.service.js"

@Module({
  imports: [
    AuthModule,
    ConfigModule,
    DatabaseModule,
    NotificationsModule,
    RateLimitModule,
    StorageModule,
  ],
  controllers: [ListingsController],
  providers: [ListingsService],
})
export class ListingsModule {}
