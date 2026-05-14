import { Module } from "@nestjs/common"

import { DatabaseModule } from "../database/database.module.js"
import { RateLimitModule } from "../rate-limit/rate-limit.module.js"
import { PlacesController } from "./places.controller.js"
import { PlacesService } from "./places.service.js"

@Module({
  imports: [DatabaseModule, RateLimitModule],
  controllers: [PlacesController],
  providers: [PlacesService],
})
export class PlacesModule {}
