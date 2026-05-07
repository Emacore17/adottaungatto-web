import { z } from "zod"

import { paginationQuerySchema } from "./pagination.js"

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

export const notificationListQuerySchema = paginationQuerySchema.extend({
  unreadOnly: queryBooleanSchema,
})

export const notificationIdParamSchema = z.object({
  notificationId: z.string().uuid(),
})

export type NotificationListQuery = z.infer<typeof notificationListQuerySchema>
