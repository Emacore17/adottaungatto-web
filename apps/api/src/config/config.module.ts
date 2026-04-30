import { Module } from "@nestjs/common"
import type { Provider } from "@nestjs/common"

import { loadApiEnv } from "./env.js"
import type { ApiEnv } from "./env.js"

export const API_ENV = Symbol("API_ENV")

const apiEnvProvider: Provider<ApiEnv> = {
  provide: API_ENV,
  useFactory: loadApiEnv,
}

@Module({
  providers: [apiEnvProvider],
  exports: [apiEnvProvider],
})
export class ConfigModule {}
