import { describe, expect, it, vi } from "vitest"

import {
  applyPublicReadPolicy,
  getDemoSourceImageDirs,
  resolveDemoSourceImagePath,
} from "./upload-demo-assets.js"

describe("demo asset source images", () => {
  it("falls back to source images bundled with the worker", () => {
    expect(getDemoSourceImageDirs().at(-1)).toContain("assets")
    expect(resolveDemoSourceImagePath("gatto-2.jpg")).not.toBeNull()
  })
})

describe("demo asset bucket policy", () => {
  it("continues when the storage provider does not implement PutBucketPolicy", async () => {
    const client = {
      setBucketPolicy: vi.fn().mockRejectedValue(
        Object.assign(new Error("PutBucketPolicy not implemented"), {
          code: "NotImplemented",
        })
      ),
    }

    await expect(
      applyPublicReadPolicy(client, "adotta-dev-assets")
    ).resolves.toBeUndefined()
    expect(client.setBucketPolicy).toHaveBeenCalledOnce()
  })

  it("rethrows unexpected bucket policy errors", async () => {
    const error = new Error("Access denied")
    const client = {
      setBucketPolicy: vi.fn().mockRejectedValue(error),
    }

    await expect(
      applyPublicReadPolicy(client, "adotta-dev-assets")
    ).rejects.toBe(error)
  })
})
