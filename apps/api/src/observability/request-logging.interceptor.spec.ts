import type { CallHandler, ExecutionContext } from "@nestjs/common"
import { lastValueFrom, of } from "rxjs"
import { describe, expect, it, vi } from "vitest"

import { ObservabilityService } from "./observability.service.js"
import { RequestLoggingInterceptor } from "./request-logging.interceptor.js"

describe("RequestLoggingInterceptor", () => {
  it("sets correlation headers and records request metrics", async () => {
    const observabilityService = new ObservabilityService()
    const interceptor = new RequestLoggingInterceptor(observabilityService)
    const response = {
      header: vi.fn(),
      statusCode: 201,
    }
    const context = createHttpContext({
      request: {
        headers: {
          "x-request-id": "request-id",
          "x-trace-id": "trace-id",
        },
        method: "post",
        url: "/listings?page=1",
      },
      response,
    })
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined)

    await lastValueFrom(
      interceptor.intercept(context, {
        handle: () => of({ ok: true }),
      } as CallHandler)
    )

    expect(response.header).toHaveBeenCalledWith("x-request-id", "request-id")
    expect(response.header).toHaveBeenCalledWith("x-trace-id", "trace-id")
    expect(observabilityService.snapshot().http.routes[0]).toMatchObject({
      method: "POST",
      route: "/listings",
      requestsTotal: 1,
      statusCodeCounts: {
        "201": 1,
      },
    })

    logSpy.mockRestore()
  })
})

function createHttpContext(input: {
  request: unknown
  response: unknown
}): ExecutionContext {
  return {
    getType: () => "http",
    switchToHttp: () => ({
      getRequest: () => input.request,
      getResponse: () => input.response,
    }),
  } as unknown as ExecutionContext
}
