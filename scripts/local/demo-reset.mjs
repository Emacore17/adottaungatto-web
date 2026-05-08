import { createDemoEnv } from "./demo-env.mjs"
import { run } from "./demo-utils.mjs"

run("docker", ["compose", "down", "-v", "--remove-orphans"], {
  env: createDemoEnv(),
})
  .then(() => {
    console.log("Local demo data reset. Run `pnpm dev:demo` to rebuild it.")
  })
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
