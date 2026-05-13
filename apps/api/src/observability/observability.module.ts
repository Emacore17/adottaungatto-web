import { Global, Module } from "@nestjs/common"
import { APP_INTERCEPTOR } from "@nestjs/core"

import { ConfigModule } from "../config/config.module.js"
import { ObservabilityService } from "./observability.service.js"
import { RequestLoggingInterceptor } from "./request-logging.interceptor.js"

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    ObservabilityService,
    {
      provide: APP_INTERCEPTOR,
      useClass: RequestLoggingInterceptor,
    },
  ],
  exports: [ObservabilityService],
})
export class ObservabilityModule {}
