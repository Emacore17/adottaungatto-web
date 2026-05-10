import { Module } from "@nestjs/common"

import { AuthModule } from "../auth/auth.module.js"
import { DatabaseModule } from "../database/database.module.js"
import { MailModule } from "../mail/mail.module.js"
import { ContactsController } from "./contacts.controller.js"
import { ContactsService } from "./contacts.service.js"

@Module({
  imports: [AuthModule, DatabaseModule, MailModule],
  controllers: [ContactsController],
  providers: [ContactsService],
})
export class ContactsModule {}
