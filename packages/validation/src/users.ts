import { z } from "zod"

const userProfileTypes = [
  "private",
  "professional",
  "association",
  "shelter",
  "breeder",
] as const

export const userProfileUpdateSchema = z
  .object({
    displayName: z.string().trim().min(2).max(80).optional(),
    phoneE164: z
      .string()
      .trim()
      .regex(/^\+[1-9]\d{7,14}$/)
      .nullable()
      .optional(),
    showPhoneOnListings: z.boolean().optional(),
    profileType: z.enum(userProfileTypes).optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one profile field must be provided.",
  })

export const userNotificationPreferencesUpdateSchema = z
  .object({
    listingModerationDecisionEmail: z.boolean().optional(),
    listingReportDecisionEmail: z.boolean().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one notification preference must be provided.",
  })

export const userPhoneVerificationConfirmSchema = z
  .object({
    code: z
      .string()
      .trim()
      .regex(/^\d{6}$/),
  })
  .strict()

export const userAccountPasswordConfirmationSchema = z
  .object({
    password: z.string().min(1).max(128),
  })
  .strict()

export type UserProfileUpdateInput = z.infer<typeof userProfileUpdateSchema>

export type UserNotificationPreferencesUpdateInput = z.infer<
  typeof userNotificationPreferencesUpdateSchema
>

export type UserPhoneVerificationConfirmInput = z.infer<
  typeof userPhoneVerificationConfirmSchema
>

export type UserAccountPasswordConfirmationInput = z.infer<
  typeof userAccountPasswordConfirmationSchema
>
