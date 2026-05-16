import { describe, expect, it } from "vitest"

import nextConfig from "./next.config.mjs"

describe("nextConfig", () => {
  it("allows listing forms to upload the maximum configured image payload", () => {
    expect(nextConfig.experimental?.serverActions?.bodySizeLimit).toBe("110mb")
    expect(nextConfig.experimental?.proxyClientMaxBodySize).toBe("110mb")
  })
})
