import { createDemoEnv } from "./demo-env.mjs"
import { pnpmCommand, runPersistent } from "./demo-utils.mjs"
import { setupDemo } from "./demo-setup.mjs"

setupDemo()
  .then(async () => {
    console.log("Starting application...")
    await runPersistent(pnpmCommand, ["dev"], { env: createDemoEnv() })
  })
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
