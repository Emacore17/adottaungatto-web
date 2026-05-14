import { resetDemo } from "./demo-reset.mjs"
import { setupDemo } from "./demo-setup.mjs"

resetDemo({ printNextStep: false })
  .then(async () => {
    await setupDemo()
    console.log("Fresh local demo ready. Run `pnpm dev` to start the app.")
  })
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
