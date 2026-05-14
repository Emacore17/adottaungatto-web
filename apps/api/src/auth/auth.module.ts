import { Module } from "@nestjs/common"

import { ConfigModule } from "../config/config.module.js"
import { DatabaseModule } from "../database/database.module.js"
import { MailModule } from "../mail/mail.module.js"
import { RateLimitModule } from "../rate-limit/rate-limit.module.js"
import { AuthController } from "./auth.controller.js"
import { BearerAuthGuard } from "./auth.guard.js"
import { AuthService } from "./auth.service.js"
import { RolesGuard } from "./roles.guard.js"

@Module({
  imports: [ConfigModule, DatabaseModule, MailModule, RateLimitModule],
  controllers: [AuthController],
  providers: [AuthService, BearerAuthGuard, RolesGuard],
  exports: [AuthService, BearerAuthGuard, RolesGuard],
})
export class AuthModule {}
