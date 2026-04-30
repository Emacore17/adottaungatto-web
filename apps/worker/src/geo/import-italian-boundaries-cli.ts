import { loadWorkerEnv } from "../config/env.js"
import { runItalianBoundariesImport } from "./import-italian-boundaries.js"

const env = loadWorkerEnv()
const apply = process.argv.includes("--apply")

try {
  const result = await runItalianBoundariesImport({
    databaseUrl: env.DATABASE_URL,
    sourceUrl: env.ISTAT_ADMIN_BOUNDARIES_ZIP_URL,
    apply,
  })

  console.log(JSON.stringify(result, null, 2))
} catch (error) {
  console.error(
    JSON.stringify(
      {
        job: "import-italian-boundaries",
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      null,
      2
    )
  )
  process.exitCode = 1
}
