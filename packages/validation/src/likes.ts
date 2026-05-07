import { z } from "zod"

export const likeListingIdParamSchema = z.object({
  listingId: z.string().uuid(),
})
