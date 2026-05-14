import "reflect-metadata"

import { NestFactory } from "@nestjs/core"
import { FastifyAdapter } from "@nestjs/platform-fastify"
import type { NestFastifyApplication } from "@nestjs/platform-fastify"

import { AppModule } from "./app.module.js"
import { API_ENV } from "./config/config.module.js"
import { loadApiEnv, type ApiEnv } from "./config/env.js"

async function bootstrap() {
  const bootstrapEnv = loadApiEnv()
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      trustProxy: bootstrapEnv.API_TRUST_PROXY,
    }),
    { bufferLogs: true }
  )
  const env = app.get<ApiEnv>(API_ENV)
  const fastify = app.getHttpAdapter().getInstance()

  fastify.addHook("onRequest", async (_request, reply) => {
    applyApiSecurityHeaders(reply, env)
  })

  app.enableCors({
    origin: env.APP_URL,
    credentials: true,
  })

  await app.listen(env.API_PORT, "0.0.0.0")
}

void bootstrap()

function applyApiSecurityHeaders(
  reply: { header: (name: string, value: string) => unknown },
  env: Pick<ApiEnv, "APP_ENV">
) {
  reply.header(
    "content-security-policy",
    "default-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'"
  )
  reply.header("cross-origin-opener-policy", "same-origin")
  reply.header("origin-agent-cluster", "?1")
  reply.header(
    "permissions-policy",
    "camera=(), microphone=(), payment=(), usb=(), geolocation=()"
  )
  reply.header("referrer-policy", "no-referrer")
  reply.header("x-content-type-options", "nosniff")
  reply.header("x-frame-options", "DENY")

  if (env.APP_ENV === "production") {
    reply.header(
      "strict-transport-security",
      "max-age=31536000; includeSubDomains; preload"
    )
  }
}
