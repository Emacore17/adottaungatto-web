import { Inject, Injectable, NotFoundException } from "@nestjs/common"
import type { NotificationListQuery } from "@workspace/validation"

import { DatabaseService } from "../database/database.service.js"
import type {
  ListingModerationDecisionNotificationPayload,
  ListingReportDecisionNotificationPayload,
  Notification,
  NotificationListResponse,
  NotificationMarkAllReadResponse,
  NotificationType,
  NotificationUnreadCountResponse,
} from "./notifications.types.js"

type NotificationRow = {
  id: string
  type: NotificationType
  payload: Record<string, unknown> | string
  read_at: Date | string | null
  created_at: Date | string
}

type NotificationListRow = NotificationRow & {
  total_count: number | string
  unread_count: number | string
}

const listNotificationsSql = `
  with user_notifications as (
    select
      id,
      type,
      payload,
      read_at,
      created_at
    from notifications
    where user_id = $1::uuid
      and ($4::boolean = false or read_at is null)
  ),
  unread_summary as (
    select count(*)::int as unread_count
    from notifications
    where user_id = $1::uuid
      and read_at is null
  )
  select
    count(*) over()::int as total_count,
    unread_summary.unread_count,
    user_notifications.id::text,
    user_notifications.type::text as type,
    user_notifications.payload,
    user_notifications.read_at,
    user_notifications.created_at
  from user_notifications
  cross join unread_summary
  order by user_notifications.created_at desc, user_notifications.id desc
  limit $2::int
  offset $3::int
`

const unreadCountSql = `
  select count(*)::int as unread_count
  from notifications
  where user_id = $1::uuid
    and read_at is null
`

const createNotificationSql = `
  insert into notifications (user_id, type, payload)
  values ($1::uuid, $2::notification_type, $3::jsonb)
  returning
    id::text,
    type::text as type,
    payload,
    read_at,
    created_at
`

const markNotificationReadSql = `
  update notifications
  set read_at = coalesce(read_at, now())
  where user_id = $1::uuid
    and id = $2::uuid
  returning
    id::text,
    type::text as type,
    payload,
    read_at,
    created_at
`

const markAllNotificationsReadSql = `
  with updated as (
    update notifications
    set read_at = now()
    where user_id = $1::uuid
      and read_at is null
    returning id
  )
  select count(*)::int as updated_count
  from updated
`

@Injectable()
export class NotificationsService {
  constructor(
    @Inject(DatabaseService)
    private readonly databaseService: DatabaseService
  ) {}

  async list(
    userId: string,
    query: NotificationListQuery
  ): Promise<NotificationListResponse> {
    const rows = await this.databaseService.queryRows<NotificationListRow>(
      listNotificationsSql,
      [
        userId,
        query.pageSize,
        (query.page - 1) * query.pageSize,
        query.unreadOnly,
      ]
    )
    const total = rows[0] ? Number(rows[0].total_count) : 0
    const unreadCount = rows[0] ? Number(rows[0].unread_count) : 0

    return {
      items: rows.map(mapNotificationRow),
      meta: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.ceil(total / query.pageSize),
        unreadCount,
      },
    }
  }

  async unreadCount(userId: string): Promise<NotificationUnreadCountResponse> {
    const [row] = await this.databaseService.queryRows<{
      unread_count: number | string
    }>(unreadCountSql, [userId])

    return {
      unreadCount: row ? Number(row.unread_count) : 0,
    }
  }

  async markRead(
    userId: string,
    notificationId: string
  ): Promise<Notification> {
    const [row] = await this.databaseService.queryRows<NotificationRow>(
      markNotificationReadSql,
      [userId, notificationId]
    )

    if (!row) {
      throw new NotFoundException("Notification not found.")
    }

    return mapNotificationRow(row)
  }

  async markAllRead(userId: string): Promise<NotificationMarkAllReadResponse> {
    const [row] = await this.databaseService.queryRows<{
      updated_count: number | string
    }>(markAllNotificationsReadSql, [userId])

    return {
      updatedCount: row ? Number(row.updated_count) : 0,
    }
  }

  async createListingModerationDecisionNotification(
    userId: string,
    payload: ListingModerationDecisionNotificationPayload
  ): Promise<Notification> {
    return this.create(userId, "listing_moderation_decision", payload)
  }

  async createListingReportDecisionNotification(
    userId: string,
    payload: ListingReportDecisionNotificationPayload
  ): Promise<Notification> {
    return this.create(userId, "listing_report_decision", payload)
  }

  private async create(
    userId: string,
    type: NotificationType,
    payload:
      | ListingModerationDecisionNotificationPayload
      | ListingReportDecisionNotificationPayload
  ): Promise<Notification> {
    const [row] = await this.databaseService.queryRows<NotificationRow>(
      createNotificationSql,
      [userId, type, JSON.stringify(payload)]
    )

    if (!row) {
      throw new NotFoundException("Notification recipient not found.")
    }

    return mapNotificationRow(row)
  }
}

function mapNotificationRow(row: NotificationRow): Notification {
  return {
    id: row.id,
    type: row.type,
    payload: normalizePayload(row.payload),
    readAt: toIsoStringOrNull(row.read_at),
    createdAt: toIsoString(row.created_at),
  }
}

function normalizePayload(value: Record<string, unknown> | string) {
  if (typeof value !== "string") {
    return value
  }

  try {
    const parsed = JSON.parse(value)
    return isRecord(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function toIsoString(value: Date | string) {
  return new Date(value).toISOString()
}

function toIsoStringOrNull(value: Date | string | null) {
  return value === null ? null : toIsoString(value)
}
