import { afterEach, describe, expect, it, vi } from "vitest"

import { createMediaProcessingLoop } from "./media-processing-loop.js"

describe("createMediaProcessingLoop", () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it("runs a batch immediately and on the configured interval", async () => {
    vi.useFakeTimers()
    const processBatch = vi.fn().mockResolvedValue({ processed: 0 })
    const loop = createMediaProcessingLoop({
      intervalMs: 1000,
      logger: createLogger(),
      processBatch,
    })

    loop.start()
    await Promise.resolve()

    expect(processBatch).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(1000)

    expect(processBatch).toHaveBeenCalledTimes(2)

    loop.stop()
  })

  it("does not create multiple intervals when started twice", async () => {
    vi.useFakeTimers()
    const processBatch = vi.fn().mockResolvedValue({ processed: 0 })
    const loop = createMediaProcessingLoop({
      intervalMs: 1000,
      logger: createLogger(),
      processBatch,
    })

    loop.start()
    loop.start()
    await Promise.resolve()

    expect(processBatch).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(1000)

    expect(processBatch).toHaveBeenCalledTimes(2)

    loop.stop()
  })

  it("does not overlap batches", async () => {
    let resolveBatch: ((value: { processed: number }) => void) | undefined
    const processBatch = vi.fn(
      () =>
        new Promise<{ processed: number }>((resolve) => {
          resolveBatch = resolve
        })
    )
    const loop = createMediaProcessingLoop({
      intervalMs: 1000,
      logger: createLogger(),
      processBatch,
    })

    void loop.tick()
    void loop.tick()

    expect(processBatch).toHaveBeenCalledTimes(1)

    resolveBatch?.({ processed: 0 })
    await Promise.resolve()
  })

  it("logs failures without stopping future batches", async () => {
    const logger = createLogger()
    const processBatch = vi
      .fn()
      .mockRejectedValueOnce(new Error("storage down"))
      .mockResolvedValueOnce({ processed: 1 })
    const loop = createMediaProcessingLoop({
      intervalMs: 1000,
      logger,
      processBatch,
    })

    await loop.tick()
    await loop.tick()

    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining("storage down")
    )
    expect(logger.log).toHaveBeenCalledWith(
      expect.stringContaining('"processed":1')
    )
  })
})

function createLogger() {
  return {
    error: vi.fn(),
    log: vi.fn(),
  }
}
