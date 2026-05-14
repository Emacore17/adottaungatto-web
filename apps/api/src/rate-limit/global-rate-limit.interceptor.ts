import {
  Inject,
  Injectable,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from "@nestjs/common"
import { from, type Observable } from "rxjs"
import { mergeMap } from "rxjs/operators"

import { API_ENV } from "../config/config.module.js"
import type { ApiEnv } from "../config/env.js"
import {
  getGlobalApiRateLimitRules,
  type GlobalRateLimitRequest,
} from "./global-rate-limit.js"
import { RateLimitService } from "./rate-limit.service.js"

type GlobalRateLimitEnv = Pick<ApiEnv, "API_GLOBAL_RATE_LIMIT_PER_MINUTE">

@Injectable()
export class GlobalRateLimitInterceptor implements NestInterceptor {
  constructor(
    @Inject(RateLimitService)
    private readonly rateLimitService: RateLimitService,
    @Inject(API_ENV)
    private readonly env: GlobalRateLimitEnv
  ) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler
  ): Observable<unknown> {
    if (context.getType() !== "http") {
      return next.handle()
    }

    const request = context
      .switchToHttp()
      .getRequest<GlobalRateLimitRequest>()

    return from(
      this.rateLimitService.enforce(
        getGlobalApiRateLimitRules(request, this.env)
      )
    ).pipe(mergeMap(() => next.handle()))
  }
}
