import { loadWorkerEnv } from "../config/env.js"
import { promoteItalianPlacesStaging } from "./promote-italian-places.js"

const env = loadWorkerEnv()
const apply = process.argv.includes("--apply")
const importRunId = getFlagValue("--import-run-id")

try {
  const result = await promoteItalianPlacesStaging({
    databaseUrl: env.DATABASE_URL,
    apply,
    importRunId,
  })

  console.log(JSON.stringify(result, null, 2))

  if (result.status === "not-found") {
    process.exitCode = 1
  }
} catch (error) {
  console.error(
    JSON.stringify(
      {
        job: "promote-italian-places",
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      null,
      2
    )
  )
  process.exitCode = 1
}

function getFlagValue(flag: string): string | undefined {
  const index = process.argv.indexOf(flag)

  if (index === -1) {
    return undefined
  }

  return process.argv[index + 1]
}
