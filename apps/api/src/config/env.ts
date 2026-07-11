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

// trustProxy: accetta un booleano, un numero di hop fidati (es. "1" dietro un
// solo reverse-proxy/ingress) oppure una lista di IP/CIDR. Evita di impostare
// `true` dietro un proxy: Fastify si fiderebbe dell'intera catena
// X-Forwarded-For, rendendo l'IP client falsificabile (bypass dei rate limit
// per-IP). Preferire il numero di hop o i CIDR dei proxy fidati.
const trustProxyEnv = z.preprocess((value) => {
  if (value === undefined || value === null || value === "") {
    return false
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase()

    if (["true", "yes", "on"].includes(normalized)) {
      return true
    }

    if (["false", "no", "off"].includes(normalized)) {
      return false
    }

    const hops = Number(normalized)

    if (Number.isInteger(hops) && hops >= 0) {
      return hops
    }

    return value.trim()
  }

  return value
}, z.union([z.boolean(), z.number().int().nonnegative(), z.string().min(1)]))

const appEnvSchema = z.enum(["local", "test", "staging", "production"])

const apiEnvBaseSchema = z.object({
  API_GLOBAL_RATE_LIMIT_PER_MINUTE: z.coerce
    .number()
    .int()
    .positive()
    .default(1200),
  API_PORT: z.coerce.number().int().positive().default(4000),
  API_TRUST_PROXY: trustProxyEnv,
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
  // Social login Google (OAuth 2.0). Off di default: gli endpoint rispondono
  // 503 finche' non sono configurati client id/secret e il redirect URI
  // registrato nella Google Console. Vedi docs/deploy-strategy.md.
  GOOGLE_CLIENT_ID: z.string().default(""),
  GOOGLE_CLIENT_SECRET: z.string().default(""),
  GOOGLE_OAUTH_ENABLED: booleanEnv(false),
  GOOGLE_OAUTH_REDIRECT_URI: z.string().default(""),
  MAIL_FROM: z.string().email().default("no-reply@adottaungatto.local"),
  MAIL_HOST: z.string().default("localhost"),
  MAIL_PASS: z.string().default(""),
  MAIL_PORT: z.coerce.number().int().positive().default(1025),
  MAIL_SECURE: booleanEnv(false),
  MAIL_USER: z.string().default(""),
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
  // Verifica telefono via SMS: tenere off finche' non e' integrato un provider
  // SMS reale (es. Twilio). Off => il contatto telefonico e' disabilitato e gli
  // annunci si pubblicano con contatto email. In local/test resta sempre attiva
  // (codice via log/devCode) a prescindere da questo flag.
  PHONE_VERIFICATION_ENABLED: booleanEnv(false),
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

  if (env.MAIL_HOST.trim() === "" || env.MAIL_HOST === "smtp.invalid") {
    addProductionIssue(ctx, "MAIL_HOST", "must be a real SMTP host")
  }

  if (env.MAIL_USER.trim() === "") {
    addProductionIssue(ctx, "MAIL_USER", "is required for authenticated SMTP")
  }

  if (env.MAIL_PASS.trim() === "") {
    addProductionIssue(ctx, "MAIL_PASS", "is required for authenticated SMTP")
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

  if (env.GOOGLE_OAUTH_ENABLED) {
    if (env.GOOGLE_CLIENT_ID.trim() === "") {
      addProductionIssue(
        ctx,
        "GOOGLE_CLIENT_ID",
        "is required when GOOGLE_OAUTH_ENABLED is true"
      )
    }

    if (env.GOOGLE_CLIENT_SECRET.trim() === "") {
      addProductionIssue(
        ctx,
        "GOOGLE_CLIENT_SECRET",
        "is required when GOOGLE_OAUTH_ENABLED is true"
      )
    }

    if (env.GOOGLE_OAUTH_REDIRECT_URI.trim() === "") {
      addProductionIssue(
        ctx,
        "GOOGLE_OAUTH_REDIRECT_URI",
        "is required when GOOGLE_OAUTH_ENABLED is true"
      )
    } else {
      rejectLocalUrl(
        ctx,
        env.GOOGLE_OAUTH_REDIRECT_URI,
        "GOOGLE_OAUTH_REDIRECT_URI"
      )
    }
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
