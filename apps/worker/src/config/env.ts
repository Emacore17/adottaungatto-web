import { z } from "zod"
import { defaultListingLifecyclePolicy } from "@workspace/domain/listing-lifecycle"

const workerEnvSchema = z.object({
  APP_ENV: z.string().default("local"),
  DATABASE_URL: z
    .string()
    .url()
    .default(
      "postgresql://adottaungatto:adottaungatto@localhost:5432/adottaungatto"
    ),
  LISTING_LIFECYCLE_CLEANUP_BATCH_SIZE: z.coerce
    .number()
    .int()
    .positive()
    .default(defaultListingLifecyclePolicy.cleanupBatchSize),
  LISTING_LIFECYCLE_CLEANUP_INTERVAL_SECONDS: z.coerce
    .number()
    .int()
    .positive()
    .default(defaultListingLifecyclePolicy.cleanupIntervalSeconds),
  LISTING_RETAIN_TERMINAL_DAYS: z.coerce
    .number()
    .int()
    .positive()
    .default(defaultListingLifecyclePolicy.retainTerminalDays),
  LISTING_STALE_DRAFT_TTL_DAYS: z.coerce
    .number()
    .int()
    .positive()
    .default(defaultListingLifecyclePolicy.staleDraftTtlDays),
  REDIS_URL: z.string().url().default("redis://localhost:6379"),
  S3_ACCESS_KEY_ID: z.string().min(1).default("minioadmin"),
  S3_BUCKET: z.string().min(3).default("adottaungatto-local"),
  S3_ENDPOINT: z.string().url().default("http://localhost:9000"),
  S3_REGION: z.string().min(1).default("local"),
  S3_SECRET_ACCESS_KEY: z.string().min(1).default("minioadmin"),
  ISTAT_MUNICIPALITIES_XLSX_URL: z
    .string()
    .url()
    .default(
      "https://www.istat.it/storage/codici-unita-amministrative/Elenco-comuni-italiani.xlsx"
    ),
  ISTAT_ADMIN_BOUNDARIES_ZIP_URL: z
    .string()
    .url()
    .default(
      "https://www.istat.it/storage/cartografia/confini_amministrativi/generalizzati/2026/Limiti01012026_g.zip"
    ),
})

export type WorkerEnv = z.infer<typeof workerEnvSchema>

export function loadWorkerEnv(env: NodeJS.ProcessEnv = process.env): WorkerEnv {
  return workerEnvSchema.parse(env)
}
