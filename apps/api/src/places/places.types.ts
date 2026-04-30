import type {
  PlaceAutocompleteQuery,
  PlaceAutocompleteType,
  PlaceNearbyQuery,
} from "@workspace/validation"

export type PlaceAutocompleteRequest = PlaceAutocompleteQuery
export type PlaceNearbyRequest = PlaceNearbyQuery

export type PlaceAutocompleteItem = {
  type: PlaceAutocompleteType
  id: string
  label: string
  subtitle: string
  istatCode: string
  hierarchy: {
    region?: {
      id: string
      name: string
      istatCode: string
    }
    province?: {
      id: string
      name: string
      istatCode: string
    }
  }
  center: {
    lat: number
    lng: number
  } | null
}

export type PlaceAutocompleteResponse = {
  items: PlaceAutocompleteItem[]
  meta: {
    query: string
    normalizedQuery: string
    limit: number
    type: PlaceAutocompleteType | "all"
  }
}

export type PlaceNearbyItem = PlaceAutocompleteItem & {
  distanceKm: number
}

export type PlaceNearbyResponse = {
  items: PlaceNearbyItem[]
  meta: {
    origin: {
      lat: number
      lng: number
    }
    radiusKm: number
    limit: number
    type: PlaceAutocompleteType | "all"
  }
}
