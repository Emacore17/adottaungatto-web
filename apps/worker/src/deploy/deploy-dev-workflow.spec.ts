import { existsSync, readFileSync } from "node:fs"
import { dirname, join } from "node:path"

import { describe, expect, it } from "vitest"

describe("deploy-dev workflow", () => {
  it("ensures complete Italian places before seeding demo data", () => {
    const workflow = readDeployDevWorkflow()
    const ensurePlacesIndex = workflow.indexOf("name: Ensure Italian places")
    const seedDemoIndex = workflow.indexOf("name: Seed demo data and assets")

    expect(ensurePlacesIndex).toBeGreaterThanOrEqual(0)
    expect(seedDemoIndex).toBeGreaterThanOrEqual(0)
    expect(ensurePlacesIndex).toBeLessThan(seedDemoIndex)
    expect(workflow).toContain("geo:verify")
    expect(workflow).toContain("geo:import:apply")
    expect(workflow).toContain("geo:promote:apply")
    expect(workflow).toContain("geo:boundaries:apply")
  })
})

function readDeployDevWorkflow() {
  let currentDirectory = process.cwd()

  while (currentDirectory !== dirname(currentDirectory)) {
    const workflowPath = join(
      currentDirectory,
      ".github",
      "workflows",
      "deploy-dev.yml"
    )

    if (existsSync(workflowPath)) {
      return readFileSync(workflowPath, "utf8")
    }

    currentDirectory = dirname(currentDirectory)
  }

  throw new Error("Unable to locate .github/workflows/deploy-dev.yml")
}
