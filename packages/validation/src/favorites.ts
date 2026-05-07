import { z } from "zod"

export const favoriteListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
})

export const favoriteListingIdParamSchema = z.object({
  listingId: z.string().uuid(),
})

export type FavoriteListQuery = z.infer<typeof favoriteListQuerySchema>
