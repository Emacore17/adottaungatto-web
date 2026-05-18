type MediaProcessingLoopOptions = {
  intervalMs: number
  jobName?: string
  logger?: Pick<typeof console, "error" | "log">
  processBatch: () => Promise<{ processed: number }>
}

export function createMediaProcessingLoop({
  intervalMs,
  jobName = "process-listing-images",
  logger = console,
  processBatch,
}: MediaProcessingLoopOptions) {
  let interval: NodeJS.Timeout | null = null
  let running = false

  async function tick() {
    if (running) {
      return
    }

    running = true

    try {
      const result = await processBatch()

      if (result.processed > 0) {
        logger.log(
          JSON.stringify({
            job: jobName,
            processed: result.processed,
            status: "ok",
          })
        )
      }
    } catch (error) {
      logger.error(
        JSON.stringify({
          job: jobName,
          message: error instanceof Error ? error.message : String(error),
          status: "error",
        })
      )
    } finally {
      running = false
    }
  }

  function start() {
    if (interval) {
      return
    }

    void tick()

    interval = setInterval(() => {
      void tick()
    }, intervalMs)
  }

  function stop() {
    if (interval) {
      clearInterval(interval)
      interval = null
    }
  }

  return {
    start,
    stop,
    tick,
  }
}
