import { randomUUID } from "node:crypto"

import { Injectable } from "@nestjs/common"

type HeaderValue = string | string[] | undefined

export type CorrelationContext = {
  requestId: string
  traceId: string
}

export type HttpRequestMetricsInput = {
  durationMs: number
  method: string
  requestId: string
  route: string
  statusCode: number
  traceId: string
}

type RouteMetrics = {
  durationSamplesMs: number[]
  errorsTotal: number
  method: string
  requestsTotal: number
  route: string
  statusCodeCounts: Record<string, number>
}

const maxRouteSamples = 200

@Injectable()
export class ObservabilityService {
  private readonly startedAt = new Date()
  private readonly routes = new Map<string, RouteMetrics>()
  private errorsTotal = 0
  private inFlightRequests = 0
  private requestsTotal = 0
  private readonly statusCodeCounts: Record<string, number> = {}

  resolveCorrelation(headers: Record<string, HeaderValue> = {}) {
    const requestId = readHeader(headers["x-request-id"]) ?? randomUUID()
    const traceId =
      readHeader(headers["x-trace-id"]) ??
      readTraceparentTraceId(headers.traceparent) ??
      requestId

    return {
      requestId,
      traceId,
    }
  }

  startHttpRequest() {
    this.inFlightRequests += 1
  }

  finishHttpRequest(input: HttpRequestMetricsInput) {
    this.inFlightRequests = Math.max(0, this.inFlightRequests - 1)
    this.requestsTotal += 1
    incrementCount(this.statusCodeCounts, String(input.statusCode))

    if (input.statusCode >= 500) {
      this.errorsTotal += 1
    }

    const key = `${input.method} ${input.route}`
    const routeMetrics =
      this.routes.get(key) ?? createRouteMetrics(input.method, input.route)

    routeMetrics.requestsTotal += 1
    incrementCount(routeMetrics.statusCodeCounts, String(input.statusCode))

    if (input.statusCode >= 500) {
      routeMetrics.errorsTotal += 1
    }

    routeMetrics.durationSamplesMs.push(input.durationMs)

    if (routeMetrics.durationSamplesMs.length > maxRouteSamples) {
      routeMetrics.durationSamplesMs.shift()
    }

    this.routes.set(key, routeMetrics)
    this.logHttpRequest(input)
  }

  snapshot() {
    return {
      service: "api",
      startedAt: this.startedAt.toISOString(),
      uptimeSeconds: Math.round(process.uptime()),
      http: {
        requestsTotal: this.requestsTotal,
        errorsTotal: this.errorsTotal,
        inFlightRequests: this.inFlightRequests,
        errorRate:
          this.requestsTotal === 0
            ? 0
            : roundRatio(this.errorsTotal / this.requestsTotal),
        statusCodeCounts: { ...this.statusCodeCounts },
        routes: Array.from(this.routes.values())
          .map((route) => ({
            method: route.method,
            route: route.route,
            requestsTotal: route.requestsTotal,
            errorsTotal: route.errorsTotal,
            statusCodeCounts: { ...route.statusCodeCounts },
            durationMs: summarizeDurations(route.durationSamplesMs),
          }))
          .sort((left, right) => right.requestsTotal - left.requestsTotal),
      },
    }
  }

  private logHttpRequest(input: HttpRequestMetricsInput) {
    const level = input.statusCode >= 500 ? "error" : "info"

    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level,
        event: "http_request",
        requestId: input.requestId,
        traceId: input.traceId,
        method: input.method,
        route: input.route,
        statusCode: input.statusCode,
        durationMs: input.durationMs,
      })
    )
  }
}

function createRouteMetrics(method: string, route: string): RouteMetrics {
  return {
    method,
    route,
    requestsTotal: 0,
    errorsTotal: 0,
    statusCodeCounts: {},
    durationSamplesMs: [],
  }
}

function incrementCount(counts: Record<string, number>, key: string) {
  counts[key] = (counts[key] ?? 0) + 1
}

function summarizeDurations(samples: number[]) {
  if (samples.length === 0) {
    return {
      avg: 0,
      p50: 0,
      p95: 0,
      p99: 0,
    }
  }

  const sorted = [...samples].sort((left, right) => left - right)
  const total = sorted.reduce((sum, value) => sum + value, 0)

  return {
    avg: Math.round(total / sorted.length),
    p50: percentile(sorted, 0.5),
    p95: percentile(sorted, 0.95),
    p99: percentile(sorted, 0.99),
  }
}

function percentile(sorted: number[], rank: number) {
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil(sorted.length * rank) - 1)
  )

  return Math.round(sorted[index] ?? 0)
}

function roundRatio(value: number) {
  return Math.round(value * 10_000) / 10_000
}

function readHeader(value: HeaderValue) {
  const raw = Array.isArray(value) ? value[0] : value
  const trimmed = raw?.trim()

  return trimmed ? trimmed : undefined
}

function readTraceparentTraceId(value: HeaderValue) {
  const traceparent = readHeader(value)
  const traceId = traceparent?.split("-")[1]

  return traceId && /^[a-f0-9]{32}$/i.test(traceId) ? traceId : undefined
}
