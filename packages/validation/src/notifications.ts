import { z } from "zod"

const queryBooleanSchema = z
  .preprocess((value) => {
    if (value === undefined) {
      return undefined
    }

    if (typeof value === "string") {
      const normalized = value.trim().toLowerCase()

      if (normalized === "true" || normalized === "1") {
        return true
      }

      if (normalized === "false" || normalized === "0") {
        return false
      }
    }

    return value
  }, z.boolean())
  .default(false)

export const notificationListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
  unreadOnly: queryBooleanSchema,
})

export const notificationIdParamSchema = z.object({
  notificationId: z.string().uuid(),
})

export type NotificationListQuery = z.infer<typeof notificationListQuerySchema>
