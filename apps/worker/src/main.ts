import { loadWorkerEnv } from "./config/env.js"
import { createWorkerStatus } from "./worker-status.js"

const env = loadWorkerEnv()
const status = createWorkerStatus(env.APP_ENV)

console.log(JSON.stringify(status))

const keepAlive = setInterval(() => {
  // Placeholder until real queues are introduced.
}, 60_000)

function shutdown() {
  clearInterval(keepAlive)
  process.exit(0)
}

process.on("SIGINT", shutdown)
process.on("SIGTERM", shutdown)
