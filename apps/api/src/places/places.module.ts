import { Module } from "@nestjs/common"

import { DatabaseModule } from "../database/database.module.js"
import { PlacesController } from "./places.controller.js"
import { PlacesService } from "./places.service.js"

@Module({
  imports: [DatabaseModule],
  controllers: [PlacesController],
  providers: [PlacesService],
})
export class PlacesModule {}
