import { z } from "zod"

const apiEnvSchema = z.object({
  API_PORT: z.coerce.number().int().positive().default(4000),
  APP_ENV: z.string().default("local"),
  APP_URL: z.string().url().default("http://localhost:3000"),
  DATABASE_URL: z
    .string()
    .url()
    .default(
      "postgresql://adottaungatto:adottaungatto@localhost:5432/adottaungatto"
    ),
  EMAIL_VERIFICATION_TTL_MINUTES: z.coerce
    .number()
    .int()
    .positive()
    .default(60),
  MAIL_FROM: z.string().email().default("no-reply@adottaungatto.local"),
  MAIL_HOST: z.string().default("localhost"),
  MAIL_PORT: z.coerce.number().int().positive().default(1025),
  PASSWORD_RESET_TTL_MINUTES: z.coerce.number().int().positive().default(30),
  REDIS_URL: z.string().url().default("redis://localhost:6379"),
  S3_ACCESS_KEY_ID: z.string().min(1).default("minioadmin"),
  S3_BUCKET: z.string().min(3).default("adottaungatto-local"),
  S3_ENDPOINT: z.string().url().default("http://localhost:9000"),
  S3_PUBLIC_ENDPOINT: z.string().url().default("http://localhost:9000"),
  S3_REGION: z.string().min(1).default("local"),
  S3_SECRET_ACCESS_KEY: z.string().min(1).default("minioadmin"),
})

export type ApiEnv = z.infer<typeof apiEnvSchema>

export function loadApiEnv(env: NodeJS.ProcessEnv = process.env): ApiEnv {
  return apiEnvSchema.parse(env)
}
