import { loadWorkerEnv } from "../config/env.js"
import { runItalianPlacesImport } from "./italian-places-import.js"

const env = loadWorkerEnv()
const apply = process.argv.includes("--apply")

try {
  const result = await runItalianPlacesImport({
    sourceUrl: env.ISTAT_MUNICIPALITIES_XLSX_URL,
    databaseUrl: env.DATABASE_URL,
    dryRun: !apply,
  })

  console.log(JSON.stringify(result, null, 2))

  if (result.status === "invalid") {
    process.exitCode = 1
  }
} catch (error) {
  console.error(
    JSON.stringify(
      {
        job: "import-italian-places",
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      null,
      2
    )
  )
  process.exitCode = 1
}
