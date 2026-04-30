import { Module } from "@nestjs/common"

import { ConfigModule } from "../config/config.module.js"
import { DatabaseModule } from "../database/database.module.js"
import { MailModule } from "../mail/mail.module.js"
import { AuthController } from "./auth.controller.js"
import { BearerAuthGuard } from "./auth.guard.js"
import { AuthService } from "./auth.service.js"

@Module({
  imports: [ConfigModule, DatabaseModule, MailModule],
  controllers: [AuthController],
  providers: [AuthService, BearerAuthGuard],
  exports: [AuthService, BearerAuthGuard],
})
export class AuthModule {}
