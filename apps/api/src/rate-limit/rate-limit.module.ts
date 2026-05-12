import { Module } from "@nestjs/common"

import { ConfigModule } from "../config/config.module.js"
import { RedisModule } from "../redis/redis.module.js"
import { RateLimitService } from "./rate-limit.service.js"

@Module({
  imports: [ConfigModule, RedisModule],
  providers: [RateLimitService],
  exports: [RateLimitService],
})
export class RateLimitModule {}
