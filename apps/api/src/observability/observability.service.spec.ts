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

  it("records public listing search metrics without raw query text", () => {
    const service = new ObservabilityService()
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined)

    service.recordPublicListingSearch({
      durationMs: 40,
      expansionType: null,
      hasGeo: false,
      queryPresent: false,
      resultCount: 12,
      sort: "recent",
    })
    service.recordPublicListingSearch({
      durationMs: 90,
      expansionType: "expanded_radius",
      hasGeo: true,
      queryPresent: true,
      resultCount: 4,
      sort: "distance",
    })

    expect(service.snapshot().search.publicListings).toMatchObject({
      requestsTotal: 2,
      queryRequestsTotal: 1,
      geoRequestsTotal: 1,
      sortCounts: {
        distance: 1,
        recent: 1,
      },
      expansionCounts: {
        expanded_radius: 1,
        none: 1,
      },
      durationMs: {
        avg: 65,
        p50: 40,
        p95: 90,
        p99: 90,
      },
      resultCount: {
        avg: 8,
        p50: 4,
        p95: 12,
        p99: 12,
      },
    })
    expect(logSpy).toHaveBeenCalledWith(
      expect.not.stringContaining("siamese")
    )

    logSpy.mockRestore()
  })

  it("does not alert before the minimum request count", () => {
    const service = new ObservabilityService({
      OBSERVABILITY_ALERT_ERROR_RATE_THRESHOLD: 0.01,
      OBSERVABILITY_ALERT_MIN_REQUESTS: 5,
      OBSERVABILITY_ALERT_P95_MS_THRESHOLD: 10,
    })
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined)

    service.startHttpRequest()
    service.finishHttpRequest({
      durationMs: 250,
      method: "GET",
      requestId: "request-id",
      route: "/listings",
      statusCode: 503,
      traceId: "trace-id",
    })

    expect(service.alerts()).toMatchObject({
      status: "ok",
      alerts: [],
    })

    logSpy.mockRestore()
  })

  it("alerts on high error rates and route p95 duration", () => {
    const service = new ObservabilityService({
      OBSERVABILITY_ALERT_ERROR_RATE_THRESHOLD: 0.25,
      OBSERVABILITY_ALERT_MIN_REQUESTS: 2,
      OBSERVABILITY_ALERT_P95_MS_THRESHOLD: 50,
    })
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

    const alerts = service.alerts()

    expect(alerts.status).toBe("alerting")
    expect(alerts.alerts.map((alert) => alert.id)).toEqual([
      "api_http_error_rate_high",
      "api_route_error_rate_high",
      "api_route_p95_duration_high",
    ])

    logSpy.mockRestore()
  })

  it("alerts on high in-flight request count", () => {
    const service = new ObservabilityService({
      OBSERVABILITY_ALERT_IN_FLIGHT_THRESHOLD: 1,
    })

    service.startHttpRequest()
    service.startHttpRequest()

    const alerts = service.alerts()

    expect(alerts.status).toBe("alerting")
    expect(alerts.alerts).toContainEqual(
      expect.objectContaining({
        id: "api_http_in_flight_high",
        observedValue: 2,
        threshold: 1,
      })
    )
  })
})
