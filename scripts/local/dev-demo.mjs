import { createDemoEnv } from "./demo-env.mjs"
import { pnpmCommand, runPersistent } from "./demo-utils.mjs"
import { resetDemo } from "./demo-reset.mjs"
import { setupDemo } from "./demo-setup.mjs"

const shouldReset =
  process.argv.includes("--reset") || process.argv.includes("--fresh")

Promise.resolve()
  .then(async () => {
    if (shouldReset) {
      console.log("Resetting local demo data before startup...")
      await resetDemo({ printNextStep: false })
    }

    await setupDemo()
  })
  .then(async () => {
    console.log("Starting application...")
    await runPersistent(pnpmCommand, ["dev"], { env: createDemoEnv() })
  })
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
