import { loadWorkerEnv } from "../config/env.js"
import { verifyItalianPlaces } from "./verify-italian-places.js"

const env = loadWorkerEnv()

try {
  const result = await verifyItalianPlaces(env.DATABASE_URL)

  console.log(
    JSON.stringify(
      {
        job: "verify-italian-places",
        status: result.ok ? "ok" : "incomplete",
        ...result,
      },
      null,
      2
    )
  )

  if (!result.ok) {
    process.exitCode = 1
  }
} catch (error) {
  console.error(
    JSON.stringify(
      {
        error: error instanceof Error ? error.message : "Unknown error",
        job: "verify-italian-places",
        status: "failed",
      },
      null,
      2
    )
  )
  process.exitCode = 1
}
