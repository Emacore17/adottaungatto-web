import { z } from "zod"

export const databaseUrlSchema = z.string().url().startsWith("postgresql://")

export const redisUrlSchema = z.string().url().startsWith("redis://")

export const appEnvSchema = z.enum(["local", "test", "staging", "production"])
