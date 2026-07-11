import { Module } from "@nestjs/common"

import { ConfigModule } from "../config/config.module.js"
import { DatabaseModule } from "../database/database.module.js"
import { MailModule } from "../mail/mail.module.js"
import { RateLimitModule } from "../rate-limit/rate-limit.module.js"
import { RedisModule } from "../redis/redis.module.js"
import { AuthController } from "./auth.controller.js"
import { BearerAuthGuard } from "./auth.guard.js"
import { AuthService } from "./auth.service.js"
import {
  GOOGLE_OAUTH_CLIENT,
  HttpGoogleOAuthClient,
} from "./google-oauth.client.js"
import { GoogleOAuthService } from "./google-oauth.service.js"
import { RolesGuard } from "./roles.guard.js"

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    MailModule,
    RateLimitModule,
    RedisModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    BearerAuthGuard,
    RolesGuard,
    GoogleOAuthService,
    { provide: GOOGLE_OAUTH_CLIENT, useClass: HttpGoogleOAuthClient },
  ],
  exports: [AuthService, BearerAuthGuard, RolesGuard],
})
export class AuthModule {}
