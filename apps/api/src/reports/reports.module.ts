import { Module } from "@nestjs/common"

import { AuthModule } from "../auth/auth.module.js"
import { DatabaseModule } from "../database/database.module.js"
import { RateLimitModule } from "../rate-limit/rate-limit.module.js"
import { ReportsController } from "./reports.controller.js"
import { ReportsService } from "./reports.service.js"

@Module({
  imports: [AuthModule, DatabaseModule, RateLimitModule],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
