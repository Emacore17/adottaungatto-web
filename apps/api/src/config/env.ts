import { z } from "zod"

const booleanEnv = (defaultValue: boolean) =>
  z.preprocess((value) => {
    if (value === undefined || value === null || value === "") {
      return defaultValue
    }

    if (typeof value === "string") {
      const normalized = value.trim().toLowerCase()

      if (["1", "true", "yes", "on"].includes(normalized)) {
        return true
      }

      if (["0", "false", "no", "off"].includes(normalized)) {
        return false
      }
    }

    return value
  }, z.boolean())

const appEnvSchema = z.enum(["local", "test", "staging", "production"])

const apiEnvBaseSchema = z.object({
  API_GLOBAL_RATE_LIMIT_PER_MINUTE: z.coerce
    .number()
    .int()
    .positive()
    .default(1200),
  API_PORT: z.coerce.number().int().positive().default(4000),
  API_TRUST_PROXY: booleanEnv(false),
  APP_ENV: appEnvSchema.default("local"),
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
  OBSERVABILITY_ALERT_ERROR_RATE_THRESHOLD: z.coerce
    .number()
    .positive()
    .default(0.05),
  OBSERVABILITY_ALERT_IN_FLIGHT_THRESHOLD: z.coerce
    .number()
    .int()
    .nonnegative()
    .default(50),
  OBSERVABILITY_ALERT_MIN_REQUESTS: z.coerce
    .number()
    .int()
    .nonnegative()
    .default(20),
  OBSERVABILITY_ALERT_P95_MS_THRESHOLD: z.coerce
    .number()
    .int()
    .positive()
    .default(1000),
  PASSWORD_RESET_TTL_MINUTES: z.coerce.number().int().positive().default(30),
  PHONE_VERIFICATION_TTL_MINUTES: z.coerce
    .number()
    .int()
    .positive()
    .default(10),
  RATE_LIMIT_ENABLED: booleanEnv(true),
  RATE_LIMIT_LIMIT_MULTIPLIER: z.coerce.number().positive().default(1),
  RATE_LIMIT_WINDOW_MULTIPLIER: z.coerce.number().positive().default(1),
  REDIS_URL: z.string().url().default("redis://localhost:6379"),
  S3_ACCESS_KEY_ID: z.string().min(1).default("minioadmin"),
  S3_BUCKET: z.string().min(3).default("adottaungatto-local"),
  S3_ENDPOINT: z.string().url().default("http://localhost:9000"),
  S3_PUBLIC_ENDPOINT: z.string().url().default("http://localhost:9000"),
  S3_REGION: z.string().min(1).default("local"),
  S3_SECRET_ACCESS_KEY: z.string().min(1).default("minioadmin"),
})

const apiEnvSchema = apiEnvBaseSchema.superRefine((env, ctx) => {
  if (env.APP_ENV !== "production") {
    return
  }

  rejectLocalUrl(ctx, env.APP_URL, "APP_URL")
  rejectLocalUrl(ctx, env.DATABASE_URL, "DATABASE_URL")
  rejectLocalUrl(ctx, env.REDIS_URL, "REDIS_URL")
  rejectLocalUrl(ctx, env.S3_ENDPOINT, "S3_ENDPOINT")
  rejectLocalUrl(ctx, env.S3_PUBLIC_ENDPOINT, "S3_PUBLIC_ENDPOINT")

  if (env.MAIL_HOST === "localhost" || env.MAIL_HOST === "127.0.0.1") {
    addProductionIssue(ctx, "MAIL_HOST", "must not point to localhost")
  }

  if (env.S3_ACCESS_KEY_ID === "minioadmin") {
    addProductionIssue(ctx, "S3_ACCESS_KEY_ID", "must not use MinIO defaults")
  }

  if (env.S3_SECRET_ACCESS_KEY === "minioadmin") {
    addProductionIssue(ctx, "S3_SECRET_ACCESS_KEY", "must not use MinIO defaults")
  }

  if (env.S3_BUCKET === "adottaungatto-local") {
    addProductionIssue(ctx, "S3_BUCKET", "must not use the local bucket name")
  }
})

export type ApiEnv = z.infer<typeof apiEnvSchema>

export function loadApiEnv(env: NodeJS.ProcessEnv = process.env): ApiEnv {
  return apiEnvSchema.parse(env)
}

function rejectLocalUrl(ctx: z.RefinementCtx, value: string, path: string) {
  try {
    const { hostname } = new URL(value)

    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "::1" ||
      hostname === "[::1]"
    ) {
      addProductionIssue(ctx, path, "must not point to localhost")
    }
  } catch {
    addProductionIssue(ctx, path, "must be a valid URL")
  }
}

function addProductionIssue(ctx: z.RefinementCtx, path: string, message: string) {
  ctx.addIssue({
    code: z.ZodIssueCode.custom,
    message: `Production ${message}.`,
    path: [path],
  })
}
