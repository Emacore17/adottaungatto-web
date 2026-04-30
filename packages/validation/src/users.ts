import { z } from "zod"

import { authProfileTypes } from "./auth.js"

export const userProfileUpdateSchema = z
  .object({
    displayName: z.string().trim().min(2).max(80).optional(),
    phoneE164: z
      .string()
      .trim()
      .regex(/^\+[1-9]\d{7,14}$/)
      .nullable()
      .optional(),
    profileType: z.enum(authProfileTypes).optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one profile field must be provided.",
  })

export type UserProfileUpdateInput = z.infer<typeof userProfileUpdateSchema>
