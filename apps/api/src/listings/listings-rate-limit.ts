import type { RateLimitRule } from "../rate-limit/rate-limit.service.js"
import {
  clientIdentifier,
  createRateLimitRule,
  resourceIdentifier,
  type RateLimitRequest,
  userIdentifier,
} from "../rate-limit/rate-limit-identifiers.js"

export type ListingsRateLimitRequest = RateLimitRequest

const listingUploadShortWindowSeconds = 15 * 60
const listingUploadHourWindowSeconds = 60 * 60

export function getCreateDraftImageUploadRateLimitRules(
  userId: string,
  listingId: string,
  request: ListingsRateLimitRequest
): RateLimitRule[] {
  return [
    createRateLimitRule(
      "listings:images:upload-url:ip",
      clientIdentifier(request),
      120,
      listingUploadHourWindowSeconds
    ),
    createRateLimitRule(
      "listings:images:upload-url:user",
      userIdentifier(userId),
      40,
      listingUploadHourWindowSeconds
    ),
    createRateLimitRule(
      "listings:images:upload-url:draft",
      resourceIdentifier("draft", listingId),
      20,
      listingUploadHourWindowSeconds
    ),
  ]
}

export function getConfirmDraftImageUploadRateLimitRules(
  userId: string,
  listingId: string,
  imageId: string,
  request: ListingsRateLimitRequest
): RateLimitRule[] {
  return [
    createRateLimitRule(
      "listings:images:confirm:ip",
      clientIdentifier(request),
      180,
      listingUploadHourWindowSeconds
    ),
    createRateLimitRule(
      "listings:images:confirm:user",
      userIdentifier(userId),
      80,
      listingUploadHourWindowSeconds
    ),
    createRateLimitRule(
      "listings:images:confirm:image",
      resourceIdentifier("image", `${listingId}:${imageId}`),
      8,
      listingUploadShortWindowSeconds
    ),
  ]
}
