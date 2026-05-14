import { pathToFileURL } from "node:url"

import { createDemoEnv } from "./demo-env.mjs"
import { run } from "./demo-utils.mjs"

export async function resetDemo(options = {}) {
  await run("docker", ["compose", "down", "-v", "--remove-orphans"], {
    env: createDemoEnv(),
  })

  if (options.printNextStep !== false) {
    console.log("Local demo data reset. Run `pnpm dev:demo` to rebuild it.")
  }
}

if (
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  resetDemo().catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
}
