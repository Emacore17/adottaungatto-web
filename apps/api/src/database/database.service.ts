import type { OnApplicationShutdown } from "@nestjs/common"
import { Inject, Injectable } from "@nestjs/common"
import { createDatabase } from "@workspace/db"
import type { Database } from "@workspace/db"

import { API_ENV } from "../config/config.module.js"
import type { ApiEnv } from "../config/env.js"

type DatabaseConnection = ReturnType<typeof createDatabase>
type QueryParameter = string | number | boolean | null | Date

@Injectable()
export class DatabaseService implements OnApplicationShutdown {
  private readonly connection: DatabaseConnection

  constructor(@Inject(API_ENV) env: ApiEnv) {
    this.connection = createDatabase(env.DATABASE_URL)
  }

  get db(): Database {
    return this.connection.db
  }

  async ping() {
    await this.connection.client`select 1`
  }

  async queryRows<T extends Record<string, unknown>>(
    query: string,
    parameters: QueryParameter[] = []
  ): Promise<T[]> {
    return this.connection.client.unsafe<T[]>(query, parameters)
  }

  async onApplicationShutdown() {
    await this.connection.client.end()
  }
}
