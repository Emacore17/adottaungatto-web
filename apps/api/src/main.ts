import "reflect-metadata"

import { NestFactory } from "@nestjs/core"
import { FastifyAdapter } from "@nestjs/platform-fastify"
import type { NestFastifyApplication } from "@nestjs/platform-fastify"

import { AppModule } from "./app.module.js"
import { API_ENV } from "./config/config.module.js"
import type { ApiEnv } from "./config/env.js"

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
    { bufferLogs: true }
  )
  const env = app.get<ApiEnv>(API_ENV)

  app.enableCors({
    origin: env.APP_URL,
    credentials: true,
  })

  await app.listen(env.API_PORT, "0.0.0.0")
}

void bootstrap()
