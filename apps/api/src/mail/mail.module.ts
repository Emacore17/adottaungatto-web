import { Module } from "@nestjs/common"

import { ConfigModule } from "../config/config.module.js"
import { MailService } from "./mail.service.js"

@Module({
  imports: [ConfigModule],
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
