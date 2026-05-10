import { Module } from "@nestjs/common"

import { AuthModule } from "./auth/auth.module.js"
import { ConfigModule } from "./config/config.module.js"
import { ContactsModule } from "./contacts/contacts.module.js"
import { DatabaseModule } from "./database/database.module.js"
import { FavoritesModule } from "./favorites/favorites.module.js"
import { HealthModule } from "./health/health.module.js"
import { LikesModule } from "./likes/likes.module.js"
import { ListingsModule } from "./listings/listings.module.js"
import { ModerationModule } from "./moderation/moderation.module.js"
import { NotificationsModule } from "./notifications/notifications.module.js"
import { PlacesModule } from "./places/places.module.js"
import { RedisModule } from "./redis/redis.module.js"
import { ReportsModule } from "./reports/reports.module.js"
import { UsersModule } from "./users/users.module.js"

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    RedisModule,
    HealthModule,
    PlacesModule,
    AuthModule,
    UsersModule,
    ListingsModule,
    ModerationModule,
    ReportsModule,
    NotificationsModule,
    FavoritesModule,
    LikesModule,
    ContactsModule,
  ],
})
export class AppModule {}
