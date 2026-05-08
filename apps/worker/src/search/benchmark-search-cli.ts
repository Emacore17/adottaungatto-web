import { loadWorkerEnv } from "../config/env.js"
import {
  cleanupSearchBenchmarkData,
  parseSearchBenchmarkCliArgs,
  runSearchBenchmark,
} from "./benchmark-search.js"

const env = loadWorkerEnv()

try {
  const cliOptions = parseSearchBenchmarkCliArgs(process.argv.slice(2))
  const { cleanup, ...benchmarkOptions } = cliOptions
  const result = cleanup
    ? await cleanupSearchBenchmarkData(env.DATABASE_URL)
    : await runSearchBenchmark({
        databaseUrl: env.DATABASE_URL,
        ...benchmarkOptions,
      })

  console.log(JSON.stringify(result, null, 2))
} catch (error) {
  console.error(
    JSON.stringify(
      {
        job: "benchmark-search",
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      null,
      2
    )
  )
  process.exitCode = 1
}
