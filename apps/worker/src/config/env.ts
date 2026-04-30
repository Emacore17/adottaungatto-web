import { z } from "zod"

const workerEnvSchema = z.object({
  APP_ENV: z.string().default("local"),
  DATABASE_URL: z
    .string()
    .url()
    .default(
      "postgresql://adottaungatto:adottaungatto@localhost:5432/adottaungatto"
    ),
  REDIS_URL: z.string().url().default("redis://localhost:6379"),
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
