import { Module } from "@nestjs/common"

import { AuthModule } from "../auth/auth.module.js"
import { ConfigModule } from "../config/config.module.js"
import { DatabaseModule } from "../database/database.module.js"
import { RateLimitModule } from "../rate-limit/rate-limit.module.js"
import { UsersController } from "./users.controller.js"
import { UsersService } from "./users.service.js"

@Module({
  imports: [AuthModule, ConfigModule, DatabaseModule, RateLimitModule],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
