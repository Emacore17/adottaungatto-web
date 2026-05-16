import { describe, expect, it } from "vitest"
import path from "node:path"

import {
  DEFAULT_SEARCH_BENCHMARK_OUTPUT_DIR,
  DEFAULT_SEARCH_BENCHMARK_SIZE,
  MAX_SEARCH_BENCHMARK_SIZE,
  MIN_SEARCH_BENCHMARK_SIZE,
  normalizeSearchBenchmarkSize,
  parseSearchBenchmarkCliArgs,
  resolveSearchBenchmarkOutputDir,
} from "./benchmark-search.js"

describe("search benchmark options", () => {
  it("uses conservative defaults", () => {
    expect(parseSearchBenchmarkCliArgs([])).toEqual({
      cleanup: false,
      datasetSize: DEFAULT_SEARCH_BENCHMARK_SIZE,
      explainAnalyze: true,
      outputDir: DEFAULT_SEARCH_BENCHMARK_OUTPUT_DIR,
      skipSeed: false,
    })
  })

  it("parses explicit CLI flags", () => {
    expect(
      parseSearchBenchmarkCliArgs([
        "--size",
        "100000",
        "--output-dir=tmp/search-bench",
        "--skip-seed",
        "--no-explain-analyze",
      ])
    ).toEqual({
      cleanup: false,
      datasetSize: 100_000,
      explainAnalyze: false,
      outputDir: "tmp/search-bench",
      skipSeed: true,
    })
  })

  it("rejects unsupported dataset sizes", () => {
    expect(() =>
      normalizeSearchBenchmarkSize(MIN_SEARCH_BENCHMARK_SIZE - 1)
    ).toThrow(`Benchmark size must be at least ${MIN_SEARCH_BENCHMARK_SIZE}.`)
    expect(() =>
      normalizeSearchBenchmarkSize(MAX_SEARCH_BENCHMARK_SIZE + 1)
    ).toThrow(`Benchmark size must be at most ${MAX_SEARCH_BENCHMARK_SIZE}.`)
    expect(() => normalizeSearchBenchmarkSize(10_000.5)).toThrow(
      "Benchmark size must be an integer."
    )
  })

  it("parses cleanup mode", () => {
    expect(parseSearchBenchmarkCliArgs(["--cleanup"])).toMatchObject({
      cleanup: true,
    })
  })

  it("resolves relative output directories from the invoking cwd", () => {
    const baseDir = path.join(path.parse(process.cwd()).root, "repo")

    expect(
      resolveSearchBenchmarkOutputDir("benchmark-results/search", baseDir)
    ).toBe(path.join(baseDir, "benchmark-results", "search"))
  })
})
