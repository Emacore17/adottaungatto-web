import { loadWorkerEnv } from "./config/env.js"
import { createMediaProcessingLoop } from "./media/media-processing-loop.js"
import { processPendingListingImages } from "./media/process-listing-images.js"
import { createWorkerStatus } from "./worker-status.js"

const env = loadWorkerEnv()
const status = createWorkerStatus(env.APP_ENV)
const mediaProcessingLoop = createMediaProcessingLoop({
  intervalMs: 10_000,
  processBatch: () =>
    processPendingListingImages({
      databaseUrl: env.DATABASE_URL,
      storage: {
        accessKeyId: env.S3_ACCESS_KEY_ID,
        bucket: env.S3_BUCKET,
        endpoint: env.S3_ENDPOINT,
        region: env.S3_REGION,
        secretAccessKey: env.S3_SECRET_ACCESS_KEY,
      },
    }),
})

console.log(JSON.stringify(status))
mediaProcessingLoop.start()

function shutdown() {
  mediaProcessingLoop.stop()
  process.exit(0)
}

process.on("SIGINT", shutdown)
process.on("SIGTERM", shutdown)
