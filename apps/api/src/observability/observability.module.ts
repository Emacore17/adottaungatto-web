import { Global, Module } from "@nestjs/common"
import { APP_INTERCEPTOR } from "@nestjs/core"

import { ObservabilityService } from "./observability.service.js"
import { RequestLoggingInterceptor } from "./request-logging.interceptor.js"

@Global()
@Module({
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
