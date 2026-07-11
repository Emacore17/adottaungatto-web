import type { OnApplicationShutdown } from "@nestjs/common"
import { Inject, Injectable } from "@nestjs/common"
import { createClient } from "redis"

import { API_ENV } from "../config/config.module.js"
import type { ApiEnv } from "../config/env.js"

type RedisClient = ReturnType<typeof createClient>

// Fixed-window rate limit atomico: incrementa il contatore, imposta la scadenza
// solo alla prima richiesta della finestra, ripara un eventuale TTL mancante e
// ritorna { count, ttl } in un'unica esecuzione server-side.
const fixedWindowScript = `
  local count = redis.call('INCR', KEYS[1])
  if count == 1 then
    redis.call('EXPIRE', KEYS[1], ARGV[1])
  end
  local ttl = redis.call('TTL', KEYS[1])
  if ttl < 0 then
    redis.call('EXPIRE', KEYS[1], ARGV[1])
    ttl = tonumber(ARGV[1])
  end
  return { count, ttl }
`

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

    // INCR + EXPIRE + TTL eseguiti atomicamente lato Redis in un unico script:
    // evita la finestra non atomica (crash tra INCR ed EXPIRE) in cui una chiave
    // potrebbe restare senza scadenza e bloccare il rate limit per sempre.
    const reply = (await this.client.eval(fixedWindowScript, {
      keys: [key],
      arguments: [String(windowSeconds)],
    })) as unknown as [number, number] | null

    const count = Number(reply?.[0] ?? 0)
    const ttlSeconds = Number(reply?.[1] ?? windowSeconds)

    return {
      count,
      ttlSeconds: ttlSeconds < 0 ? windowSeconds : ttlSeconds,
    }
  }

  async setWithExpiry(key: string, value: string, ttlSeconds: number) {
    await this.connect()

    await this.client.set(key, value, { EX: ttlSeconds })
  }

  // Atomic read-and-delete: usato per gli state/handoff OAuth monouso, cosi' un
  // codice intercettato non puo' essere riusato.
  async takeValue(key: string): Promise<string | null> {
    await this.connect()

    return this.client.getDel(key)
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
