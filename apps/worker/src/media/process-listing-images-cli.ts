import { loadWorkerEnv } from "../config/env.js"
import { processPendingListingImages } from "./process-listing-images.js"

const env = loadWorkerEnv()
const limit = readLimit()

try {
  const result = await processPendingListingImages({
    databaseUrl: env.DATABASE_URL,
    storage: {
      accessKeyId: env.S3_ACCESS_KEY_ID,
      bucket: env.S3_BUCKET,
      endpoint: env.S3_ENDPOINT,
      region: env.S3_REGION,
      secretAccessKey: env.S3_SECRET_ACCESS_KEY,
    },
    limit,
  })

  console.log(JSON.stringify(result, null, 2))
} catch (error) {
  console.error(
    JSON.stringify(
      {
        job: "process-listing-images",
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      null,
      2
    )
  )
  process.exitCode = 1
}

function readLimit() {
  const limitArg = process.argv.find((arg) => arg.startsWith("--limit="))

  if (!limitArg) {
    return 20
  }

  const limit = Number(limitArg.slice("--limit=".length))

  return Number.isInteger(limit) && limit > 0 ? limit : 20
}
