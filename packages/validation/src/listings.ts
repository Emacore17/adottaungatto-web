import { z } from "zod"

export const listingSexes = ["male", "female", "unknown"] as const

export const listingImageMimeTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const

export const listingImageMaxSizeBytes = 10 * 1024 * 1024

const nullableUuidSchema = z.string().uuid().nullable()

const listingDraftFieldsSchema = z.object({
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().min(10).max(5000),
  breedId: nullableUuidSchema.optional(),
  sex: z.enum(listingSexes),
  ageMonthsMin: z.coerce.number().int().min(0).max(360).nullable().optional(),
  ageMonthsMax: z.coerce.number().int().min(0).max(360).nullable().optional(),
  municipalityId: nullableUuidSchema.optional(),
  contributionCents: z.coerce
    .number()
    .int()
    .min(0)
    .max(500_000)
    .nullable()
    .optional(),
  isFree: z.boolean(),
  isVaccinated: z.boolean().nullable().optional(),
  isSterilized: z.boolean().nullable().optional(),
  isDewormed: z.boolean().nullable().optional(),
  hasMicrochip: z.boolean().nullable().optional(),
})

export const listingDraftCreateSchema = listingDraftFieldsSchema
  .extend({
    sex: z.enum(listingSexes).default("unknown"),
    isFree: z.boolean().default(true),
  })
  .strict()
  .superRefine(validateDraftFields)

export const listingDraftUpdateSchema = listingDraftFieldsSchema
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one listing draft field must be provided.",
  })
  .superRefine(validateDraftFields)

export const listingDraftListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
})

export const listingPublicListQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(50).default(20),
    breedId: z.string().uuid().optional(),
    municipalityId: z.string().uuid().optional(),
    provinceId: z.string().uuid().optional(),
    regionId: z.string().uuid().optional(),
    sex: z.enum(listingSexes).optional(),
  })
  .strict()

export const listingDraftIdParamSchema = z.object({
  id: z.string().uuid(),
})

export const listingPublicIdParamSchema = z.object({
  id: z.string().uuid(),
})

export const listingImageUploadRequestSchema = z
  .object({
    mimeType: z.enum(listingImageMimeTypes),
    sizeBytes: z.coerce.number().int().min(1).max(listingImageMaxSizeBytes),
    isCover: z.boolean().default(false),
  })
  .strict()

export type ListingSex = (typeof listingSexes)[number]

export type ListingImageMimeType = (typeof listingImageMimeTypes)[number]

export type ListingDraftCreateInput = z.infer<typeof listingDraftCreateSchema>

export type ListingDraftUpdateInput = z.infer<typeof listingDraftUpdateSchema>

export type ListingDraftListQuery = z.infer<typeof listingDraftListQuerySchema>

export type ListingPublicListQuery = z.infer<
  typeof listingPublicListQuerySchema
>

export type ListingImageUploadRequestInput = z.infer<
  typeof listingImageUploadRequestSchema
>

function validateDraftFields(
  input: Partial<z.infer<typeof listingDraftFieldsSchema>>,
  context: z.RefinementCtx
) {
  if (
    input.ageMonthsMin !== undefined &&
    input.ageMonthsMin !== null &&
    input.ageMonthsMax !== undefined &&
    input.ageMonthsMax !== null &&
    input.ageMonthsMin > input.ageMonthsMax
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Minimum age cannot be greater than maximum age.",
      path: ["ageMonthsMax"],
    })
  }

  if (
    input.isFree === true &&
    input.contributionCents !== undefined &&
    input.contributionCents !== null &&
    input.contributionCents > 0
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Free listings cannot require a contribution.",
      path: ["contributionCents"],
    })
  }

  if (
    input.isFree === false &&
    (input.contributionCents === undefined ||
      input.contributionCents === null ||
      input.contributionCents === 0)
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Paid listings require a contribution amount.",
      path: ["contributionCents"],
    })
  }
}
