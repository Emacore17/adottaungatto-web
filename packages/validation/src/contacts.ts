import { z } from "zod"

export const listingContactRequestListQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(50).default(20),
  })
  .strict()

export const listingContactListingIdParamSchema = z.object({
  listingId: z.string().uuid(),
})

export const listingContactCreateSchema = z
  .object({
    message: z.string().trim().min(20).max(2000),
    shareEmail: z.boolean().refine((value) => value, {
      message: "Email sharing consent is required.",
    }),
    sharePhone: z.boolean().default(false),
  })
  .strict()

export type ListingContactCreateInput = z.infer<
  typeof listingContactCreateSchema
>

export type ListingContactRequestListQuery = z.infer<
  typeof listingContactRequestListQuerySchema
>
