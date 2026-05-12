import { performance } from "node:perf_hooks"

import {
  Inject,
  Injectable,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from "@nestjs/common"
import { Observable } from "rxjs"
import { finalize, tap } from "rxjs/operators"

import { ObservabilityService } from "./observability.service.js"

type ObservedHttpRequest = {
  headers?: Record<string, string | string[] | undefined>
  method?: string
  routeOptions?: {
    url?: string
  }
  routerPath?: string
  url?: string
}

type ObservedHttpResponse = {
  header?: (name: string, value: string) => unknown
  setHeader?: (name: string, value: string) => unknown
  statusCode?: number
}

@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  constructor(
    @Inject(ObservabilityService)
    private readonly observabilityService: ObservabilityService
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== "http") {
      return next.handle()
    }

    const http = context.switchToHttp()
    const request = http.getRequest<ObservedHttpRequest>()
    const response = http.getResponse<ObservedHttpResponse>()
    const correlation = this.observabilityService.resolveCorrelation(
      request.headers
    )
    const method = normalizeMethod(request.method)
    const route = normalizeRoute(request)
    const startedAt = performance.now()
    let finished = false

    setResponseHeader(response, "x-request-id", correlation.requestId)
    setResponseHeader(response, "x-trace-id", correlation.traceId)
    this.observabilityService.startHttpRequest()

    const finish = (error?: unknown) => {
      if (finished) {
        return
      }

      finished = true
      this.observabilityService.finishHttpRequest({
        method,
        route,
        requestId: correlation.requestId,
        traceId: correlation.traceId,
        statusCode:
          error === undefined
            ? normalizeStatusCode(response.statusCode)
            : getErrorStatusCode(error),
        durationMs: Math.round(performance.now() - startedAt),
      })
    }

    return next.handle().pipe(
      tap({
        next: () => {
          finish()
        },
        error: (error: unknown) => {
          finish(error)
        },
      }),
      finalize(() => {
        finish()
      })
    )
  }
}

function setResponseHeader(
  response: ObservedHttpResponse,
  name: string,
  value: string
) {
  if (response.header) {
    response.header(name, value)
    return
  }

  response.setHeader?.(name, value)
}

function normalizeMethod(method: string | undefined) {
  return method?.toUpperCase() ?? "UNKNOWN"
}

function normalizeRoute(request: ObservedHttpRequest) {
  const route = request.routeOptions?.url ?? request.routerPath ?? request.url
  const withoutQuery = route?.split("?")[0]?.trim()

  return withoutQuery || "unknown"
}

function normalizeStatusCode(statusCode: number | undefined) {
  return statusCode && statusCode >= 100 ? statusCode : 200
}

function getErrorStatusCode(error: unknown) {
  if (
    typeof error === "object" &&
    error !== null &&
    "getStatus" in error &&
    typeof error.getStatus === "function"
  ) {
    const status = error.getStatus()

    return typeof status === "number" ? status : 500
  }

  return 500
}
