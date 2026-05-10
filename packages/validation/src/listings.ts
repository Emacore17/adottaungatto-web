import { z } from "zod"

export const listingSexes = ["male", "female", "unknown"] as const
export const listingPublicSorts = ["relevance", "recent", "distance"] as const

export const listingImageMimeTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const

export const listingImageMaxSizeBytes = 10 * 1024 * 1024

const nullableUuidSchema = z.string().uuid().nullable()

const queryBooleanSchema = z.union([
  z.boolean(),
  z.enum(["true", "false"]).transform((value) => value === "true"),
])

const optionalSearchQuerySchema = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim() === "" ? undefined : value,
  z
    .string()
    .trim()
    .min(2)
    .max(120)
    .refine((value) => /[\p{L}\p{N}]/u.test(value), {
      message: "Search query must contain at least one letter or number.",
    })
    .optional()
)

const optionalLatitudeSchema = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim() === "" ? undefined : value,
  z.coerce.number().min(-90).max(90).optional()
)

const optionalLongitudeSchema = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim() === "" ? undefined : value,
  z.coerce.number().min(-180).max(180).optional()
)

const optionalContributionCentsSchema = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim() === "" ? undefined : value,
  z.coerce.number().int().min(0).max(500_000).optional()
)

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
  contactRequestsEnabled: z.boolean(),
})

export const listingDraftCreateSchema = listingDraftFieldsSchema
  .extend({
    sex: z.enum(listingSexes).default("unknown"),
    isFree: z.boolean().default(true),
    contactRequestsEnabled: z.boolean().default(true),
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
    q: optionalSearchQuerySchema,
    breedId: z.string().uuid().optional(),
    municipalityId: z.string().uuid().optional(),
    provinceId: z.string().uuid().optional(),
    regionId: z.string().uuid().optional(),
    sex: z.enum(listingSexes).optional(),
    ageMonthsMin: z.coerce.number().int().min(0).max(360).optional(),
    ageMonthsMax: z.coerce.number().int().min(0).max(360).optional(),
    isFree: queryBooleanSchema.optional(),
    contributionCentsMin: optionalContributionCentsSchema,
    contributionCentsMax: optionalContributionCentsSchema,
    isVaccinated: queryBooleanSchema.optional(),
    isSterilized: queryBooleanSchema.optional(),
    isDewormed: queryBooleanSchema.optional(),
    hasMicrochip: queryBooleanSchema.optional(),
    hasImages: queryBooleanSchema.optional(),
    lat: optionalLatitudeSchema,
    lng: optionalLongitudeSchema,
    radiusKm: z.coerce.number().min(1).max(500).optional(),
    sort: z.enum(listingPublicSorts).optional(),
  })
  .strict()
  .superRefine(validatePublicListQuery)

export const listingDraftIdParamSchema = z.object({
  id: z.string().uuid(),
})

export const listingImageIdParamSchema = z.object({
  imageId: z.string().uuid(),
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

export const listingImageOrderSchema = z
  .object({
    imageIds: z
      .array(z.string().uuid())
      .min(1)
      .max(10)
      .refine((imageIds) => new Set(imageIds).size === imageIds.length, {
        message: "Image order cannot contain duplicate images.",
      }),
  })
  .strict()

export type ListingSex = (typeof listingSexes)[number]

export type ListingPublicSort = (typeof listingPublicSorts)[number]

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

export type ListingImageOrderInput = z.infer<
  typeof listingImageOrderSchema
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

function validatePublicListQuery(
  input: {
    ageMonthsMin?: number
    ageMonthsMax?: number
    contributionCentsMin?: number
    contributionCentsMax?: number
    isFree?: boolean
    lat?: number
    lng?: number
    radiusKm?: number
    sort?: ListingPublicSort
  },
  context: z.RefinementCtx
) {
  if (
    input.ageMonthsMin !== undefined &&
    input.ageMonthsMax !== undefined &&
    input.ageMonthsMin > input.ageMonthsMax
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Minimum age cannot be greater than maximum age.",
      path: ["ageMonthsMax"],
    })
  }

  if (
    input.contributionCentsMin !== undefined &&
    input.contributionCentsMax !== undefined &&
    input.contributionCentsMin > input.contributionCentsMax
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Minimum contribution cannot be greater than maximum contribution.",
      path: ["contributionCentsMax"],
    })
  }

  if (
    input.isFree === true &&
    (input.contributionCentsMin !== undefined ||
      input.contributionCentsMax !== undefined)
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Free listings cannot be filtered by contribution amount.",
      path:
        input.contributionCentsMin !== undefined
          ? ["contributionCentsMin"]
          : ["contributionCentsMax"],
    })
  }

  const hasLat = input.lat !== undefined
  const hasLng = input.lng !== undefined

  if (hasLat !== hasLng) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Latitude and longitude must be provided together.",
      path: hasLat ? ["lng"] : ["lat"],
    })
  }

  if (input.radiusKm !== undefined && (!hasLat || !hasLng)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Radius requires latitude and longitude.",
      path: ["radiusKm"],
    })
  }

  if (input.sort === "distance" && (!hasLat || !hasLng)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Distance sorting requires latitude and longitude.",
      path: ["sort"],
    })
  }
}
