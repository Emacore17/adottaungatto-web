import { z } from "zod"

export const placeAutocompleteTypes = [
  "municipality",
  "province",
  "region",
] as const

export const placeAutocompleteQuerySchema = z.object({
  q: z.string().trim().min(2).max(80),
  limit: z.coerce.number().int().min(1).max(20).default(8),
  type: z.enum(placeAutocompleteTypes).optional(),
})

export const placeNearbyQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radiusKm: z.coerce.number().positive().max(500).default(50),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  type: z.enum(placeAutocompleteTypes).optional(),
})

export type PlaceAutocompleteType = (typeof placeAutocompleteTypes)[number]

export type PlaceAutocompleteQuery = z.infer<
  typeof placeAutocompleteQuerySchema
>

export type PlaceNearbyQuery = z.infer<typeof placeNearbyQuerySchema>
