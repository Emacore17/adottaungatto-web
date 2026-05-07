import { Module } from "@nestjs/common"

import { AuthModule } from "../auth/auth.module.js"
import { DatabaseModule } from "../database/database.module.js"
import { MailModule } from "../mail/mail.module.js"
import { NotificationsModule } from "../notifications/notifications.module.js"
import { ModerationController } from "./moderation.controller.js"
import { ModerationService } from "./moderation.service.js"

@Module({
  imports: [AuthModule, DatabaseModule, MailModule, NotificationsModule],
  controllers: [ModerationController],
  providers: [ModerationService],
})
export class ModerationModule {}
