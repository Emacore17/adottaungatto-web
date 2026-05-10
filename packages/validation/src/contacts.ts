import { z } from "zod"

export const listingContactListingIdParamSchema = z.object({
  listingId: z.string().uuid(),
})

export const listingContactCreateSchema = z
  .object({
    message: z.string().trim().min(20).max(2000),
    shareEmail: z.boolean().refine((value) => value, {
      message: "Email sharing consent is required.",
    }),
  })
  .strict()

export type ListingContactCreateInput = z.infer<
  typeof listingContactCreateSchema
>
