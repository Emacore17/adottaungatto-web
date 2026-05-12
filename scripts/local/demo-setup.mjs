import { pathToFileURL } from "node:url"

import { createDemoEnv } from "./demo-env.mjs"
import { pnpmCommand, run, waitForTcpPort } from "./demo-utils.mjs"

export async function setupDemo() {
  const env = createDemoEnv()

  console.log("Starting local infrastructure...")
  await run("docker", ["compose", "up", "-d"], { env })

  console.log("Waiting for PostgreSQL, Redis and MinIO...")
  await Promise.all([
    waitForTcpPort(5432),
    waitForTcpPort(6379),
    waitForTcpPort(9000),
  ])

  console.log("Running database migrations...")
  await run(pnpmCommand, ["db:migrate"], { env })

  console.log("Seeding base data...")
  await run(pnpmCommand, ["db:seed"], { env })

  console.log("Seeding demo data...")
  await run(pnpmCommand, ["db:seed:demo"], { env })

  console.log("Uploading demo media assets...")
  await run(pnpmCommand, ["--filter", "worker", "demo:assets"], { env })

  console.log("Demo setup ready.")
  console.log("Demo password: demo-password-123")
  console.log("Accounts:")
  console.log("- rifugio.torino@demo.adottaungatto.local")
  console.log("- volontari.italia@demo.adottaungatto.local")
  console.log("- marta.demo@demo.adottaungatto.local")
  console.log("- moderatore@demo.adottaungatto.local")
  console.log("- admin@demo.adottaungatto.local")
}

if (
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  setupDemo().catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
}
