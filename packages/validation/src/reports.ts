import { z } from "zod"

export const listingReportReasonCodes = [
  "not_relevant",
  "inappropriate_images",
  "suspected_scam",
  "false_information",
  "abuse",
  "other",
] as const

export const listingReportListingIdParamSchema = z.object({
  listingId: z.string().uuid(),
})

export const listingReportCreateSchema = z
  .object({
    reasonCode: z.enum(listingReportReasonCodes),
    description: z.string().trim().min(1).max(2000).optional(),
  })
  .strict()
  .superRefine((input, context) => {
    if (input.reasonCode === "other" && !input.description) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Description is required when reasonCode is other.",
        path: ["description"],
      })
    }
  })

export type ListingReportReasonCode =
  (typeof listingReportReasonCodes)[number]

export type ListingReportCreateInput = z.infer<
  typeof listingReportCreateSchema
>
