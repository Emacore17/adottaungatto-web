import type { OnApplicationShutdown } from "@nestjs/common"
import { Inject, Injectable } from "@nestjs/common"
import { createClient } from "redis"

import { API_ENV } from "../config/config.module.js"
import type { ApiEnv } from "../config/env.js"

type RedisClient = ReturnType<typeof createClient>

@Injectable()
export class RedisService implements OnApplicationShutdown {
  private readonly client: RedisClient

  constructor(@Inject(API_ENV) env: ApiEnv) {
    this.client = createClient({ url: env.REDIS_URL })
    this.client.on("error", () => {
      // Errors surface through ping(); this listener prevents unhandled events.
    })
  }

  async ping() {
    await this.connect()

    const response = await this.client.ping()

    if (response !== "PONG") {
      throw new Error(`Unexpected Redis ping response: ${response}`)
    }
  }

  async incrementFixedWindow(key: string, windowSeconds: number) {
    await this.connect()

    const count = await this.client.incr(key)

    if (count === 1) {
      await this.client.expire(key, windowSeconds)
    }

    let ttlSeconds = await this.client.ttl(key)

    if (ttlSeconds < 0) {
      await this.client.expire(key, windowSeconds)
      ttlSeconds = windowSeconds
    }

    return {
      count,
      ttlSeconds,
    }
  }

  async onApplicationShutdown() {
    if (this.client.isOpen) {
      await this.client.quit()
    }
  }

  private async connect() {
    if (!this.client.isOpen) {
      await this.client.connect()
    }
  }
}
