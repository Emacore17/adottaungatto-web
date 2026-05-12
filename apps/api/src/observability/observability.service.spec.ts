import { describe, expect, it, vi } from "vitest"

import { ObservabilityService } from "./observability.service.js"

describe("ObservabilityService", () => {
  it("resolves request and trace identifiers from headers", () => {
    const service = new ObservabilityService()

    expect(
      service.resolveCorrelation({
        "x-request-id": " request-id ",
        traceparent: "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01",
      })
    ).toEqual({
      requestId: "request-id",
      traceId: "4bf92f3577b34da6a3ce929d0e0e4736",
    })
  })

  it("records HTTP request counters and duration summaries", () => {
    const service = new ObservabilityService()
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined)

    service.startHttpRequest()
    service.finishHttpRequest({
      durationMs: 25,
      method: "GET",
      requestId: "request-id",
      route: "/listings",
      statusCode: 200,
      traceId: "trace-id",
    })
    service.startHttpRequest()
    service.finishHttpRequest({
      durationMs: 75,
      method: "GET",
      requestId: "request-id-2",
      route: "/listings",
      statusCode: 503,
      traceId: "trace-id-2",
    })

    const snapshot = service.snapshot()

    expect(snapshot.http.requestsTotal).toBe(2)
    expect(snapshot.http.errorsTotal).toBe(1)
    expect(snapshot.http.errorRate).toBe(0.5)
    expect(snapshot.http.inFlightRequests).toBe(0)
    expect(snapshot.http.statusCodeCounts).toEqual({
      "200": 1,
      "503": 1,
    })
    expect(snapshot.http.routes[0]).toMatchObject({
      method: "GET",
      route: "/listings",
      requestsTotal: 2,
      errorsTotal: 1,
      durationMs: {
        avg: 50,
        p50: 25,
        p95: 75,
        p99: 75,
      },
    })
    expect(logSpy).toHaveBeenCalledTimes(2)

    logSpy.mockRestore()
  })
})
