import type { RateLimitRule } from "../rate-limit/rate-limit.service.js"
import {
  clientIdentifier,
  createRateLimitRule,
  resourceIdentifier,
  type RateLimitRequest,
  userIdentifier,
} from "../rate-limit/rate-limit-identifiers.js"
import type { ListingPublicListQuery } from "@workspace/validation"

export type ListingsRateLimitRequest = RateLimitRequest

const listingUploadShortWindowSeconds = 15 * 60
const listingUploadHourWindowSeconds = 60 * 60
const listingPhoneShortWindowSeconds = 15 * 60
const listingPhoneHourWindowSeconds = 60 * 60
const listingPublicMinuteWindowSeconds = 60

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

export function getListPublicListingsRateLimitRules(
  query: ListingPublicListQuery,
  request: ListingsRateLimitRequest
): RateLimitRule[] {
  const rules = [
    createRateLimitRule(
      "listings:public:list:ip",
      clientIdentifier(request),
      240,
      listingPublicMinuteWindowSeconds
    ),
  ]

  if (hasExpensivePublicListingQuery(query)) {
    rules.push(
      createRateLimitRule(
        "listings:public:search:ip",
        clientIdentifier(request),
        90,
        listingPublicMinuteWindowSeconds
      )
    )
  }

  return rules
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

export function getRequestDraftPhoneVerificationRateLimitRules(
  userId: string,
  listingId: string,
  request: ListingsRateLimitRequest
): RateLimitRule[] {
  return [
    createRateLimitRule(
      "listings:phone-verification:request:ip",
      clientIdentifier(request),
      60,
      listingPhoneHourWindowSeconds
    ),
    createRateLimitRule(
      "listings:phone-verification:request:user",
      userIdentifier(userId),
      12,
      listingPhoneHourWindowSeconds
    ),
    createRateLimitRule(
      "listings:phone-verification:request:draft",
      resourceIdentifier("draft", listingId),
      4,
      listingPhoneShortWindowSeconds
    ),
  ]
}

export function getConfirmDraftPhoneVerificationRateLimitRules(
  userId: string,
  listingId: string,
  request: ListingsRateLimitRequest
): RateLimitRule[] {
  return [
    createRateLimitRule(
      "listings:phone-verification:confirm:ip",
      clientIdentifier(request),
      80,
      listingPhoneHourWindowSeconds
    ),
    createRateLimitRule(
      "listings:phone-verification:confirm:user",
      userIdentifier(userId),
      20,
      listingPhoneHourWindowSeconds
    ),
    createRateLimitRule(
      "listings:phone-verification:confirm:draft",
      resourceIdentifier("draft", listingId),
      8,
      listingPhoneShortWindowSeconds
    ),
  ]
}

function hasExpensivePublicListingQuery(query: ListingPublicListQuery) {
  return Boolean(
    query.q ||
    query.lat !== undefined ||
    query.lng !== undefined ||
    query.radiusKm !== undefined ||
    query.breedId ||
    query.municipalityId ||
    query.provinceId ||
    query.regionId ||
    query.sex ||
    query.ageMonthsMin !== undefined ||
    query.ageMonthsMax !== undefined ||
    query.contributionCentsMin !== undefined ||
    query.contributionCentsMax !== undefined
  )
}
