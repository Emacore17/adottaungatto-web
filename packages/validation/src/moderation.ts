import { z } from "zod"

const moderationReasonCodeSchema = z
  .string()
  .trim()
  .min(1)
  .max(80)
  .regex(/^[a-z0-9_:-]+$/, {
    message:
      "Reason code can contain lowercase letters, numbers, underscores, colons and hyphens.",
  })

export const moderationCaseIdParamSchema = z.object({
  caseId: z.string().uuid(),
})

export const moderationDecisionSchema = z
  .object({
    reasonCode: moderationReasonCodeSchema.optional(),
    reasonText: z.string().trim().min(1).max(2000).optional(),
  })
  .strict()
  .refine((value) => value.reasonCode || value.reasonText, {
    message: "A moderation decision requires a reason.",
    path: ["reasonCode"],
  })

export type ModerationDecisionInput = z.infer<
  typeof moderationDecisionSchema
>
