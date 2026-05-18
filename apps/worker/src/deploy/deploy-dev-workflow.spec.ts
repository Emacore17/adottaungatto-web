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

  it("keeps dev online private while allowing secure smoke tests", () => {
    const workflow = readDeployDevWorkflow()
    const remoteSmoke = readRepoFile("scripts", "deploy", "remote-smoke.mjs")

    expect(workflow).toContain("SEARCH_INDEXING_ENABLED=false")
    expect(workflow).toContain("TRUSTED_ACTION_ORIGINS")
    expect(workflow).toContain("CLOUDFLARE_ACCESS_CLIENT_ID")
    expect(workflow).toContain("CLOUDFLARE_ACCESS_CLIENT_SECRET")
    expect(workflow).toContain("name: Restrict API ingress to Cloudflare")
    expect(workflow).toContain("https://www.cloudflare.com/ips-v4")
    expect(remoteSmoke).toContain("CF-Access-Client-Id")
  })
})

function readDeployDevWorkflow() {
  return readRepoFile(".github", "workflows", "deploy-dev.yml")
}

function readRepoFile(...segments: string[]) {
  let currentDirectory = process.cwd()

  while (currentDirectory !== dirname(currentDirectory)) {
    const filePath = join(currentDirectory, ...segments)

    if (existsSync(filePath)) {
      return readFileSync(filePath, "utf8")
    }

    currentDirectory = dirname(currentDirectory)
  }

  throw new Error(`Unable to locate ${segments.join("/")}`)
}
