import { Module } from "@nestjs/common"
import { APP_INTERCEPTOR } from "@nestjs/core"

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
import { ObservabilityModule } from "./observability/observability.module.js"
import { PlacesModule } from "./places/places.module.js"
import { RedisModule } from "./redis/redis.module.js"
import { ReportsModule } from "./reports/reports.module.js"
import { GlobalRateLimitInterceptor } from "./rate-limit/global-rate-limit.interceptor.js"
import { RateLimitModule } from "./rate-limit/rate-limit.module.js"
import { UsersModule } from "./users/users.module.js"

@Module({
  imports: [
    ConfigModule,
    ObservabilityModule,
    DatabaseModule,
    RedisModule,
    RateLimitModule,
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
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: GlobalRateLimitInterceptor,
    },
  ],
})
export class AppModule {}
