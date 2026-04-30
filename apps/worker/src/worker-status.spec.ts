import { describe, expect, it } from "vitest"

import { createWorkerStatus } from "./worker-status.js"

describe("createWorkerStatus", () => {
  it("returns worker status metadata", () => {
    const status = createWorkerStatus("test")

    expect(status.service).toBe("worker")
    expect(status.status).toBe("ok")
    expect(status.environment).toBe("test")
  })
})
