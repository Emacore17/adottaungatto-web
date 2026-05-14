import type {
  PlaceAutocompleteQuery,
  PlaceNearbyQuery,
} from "@workspace/validation"

import type { RateLimitRule } from "../rate-limit/rate-limit.service.js"
import {
  clientIdentifier,
  createRateLimitRule,
  type RateLimitRequest,
} from "../rate-limit/rate-limit-identifiers.js"

export type PlacesRateLimitRequest = RateLimitRequest

const placesMinuteWindowSeconds = 60

export function getPlaceAutocompleteRateLimitRules(
  _query: PlaceAutocompleteQuery,
  request: PlacesRateLimitRequest
): RateLimitRule[] {
  return [
    createRateLimitRule(
      "places:autocomplete:ip",
      clientIdentifier(request),
      180,
      placesMinuteWindowSeconds
    ),
  ]
}

export function getPlaceNearbyRateLimitRules(
  _query: PlaceNearbyQuery,
  request: PlacesRateLimitRequest
): RateLimitRule[] {
  return [
    createRateLimitRule(
      "places:nearby:ip",
      clientIdentifier(request),
      120,
      placesMinuteWindowSeconds
    ),
  ]
}
