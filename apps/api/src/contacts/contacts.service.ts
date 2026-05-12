import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common"
import type {
  ListingContactCreateInput,
  ListingContactRequestListQuery,
} from "@workspace/validation"

import type { AuthUser } from "../auth/auth.types.js"
import { DatabaseService } from "../database/database.service.js"
import { MailService } from "../mail/mail.service.js"
import type {
  ListingContactRequest,
  ListingContactRequestResponse,
  ListingContactRequestStatus,
  ReceivedListingContactRequest,
  ReceivedListingContactRequestListResponse,
} from "./contacts.types.js"

type ContactableListingRow = {
  id: string
  title: string
  owner_user_id: string
  owner_email: string
  owner_display_name: string
}

type ContactRequestRow = {
  id: string
  listing_id: string
  requester_user_id: string
  owner_user_id: string
  status: "sent"
  email_shared: boolean
  created_at: Date | string
  delivered_at: Date | string
}

type ReceivedContactRequestRow = {
  total_count: number | string
  id: string
  listing_id: string
  listing_title: string
  requester_user_id: string
  requester_email: string | null
  requester_display_name_snapshot: string
  message: string
  status: ListingContactRequestStatus
  email_shared: boolean
  created_at: Date | string
  delivered_at: Date | string | null
  failed_at: Date | string | null
  failure_reason: string | null
}

type FailedContactRequestRow = {
  id: string
}

type ContactRateLimitRow = {
  requester_hour_count: number | string
  requester_day_count: number | string
  listing_day_count: number | string
  owner_hour_count: number | string
}

const requesterHourlyContactLimit = 5
const requesterDailyContactLimit = 20
const requesterListingDailyContactLimit = 1
const ownerHourlyContactLimit = 20
const contactHourWindowSeconds = 60 * 60
const contactDayWindowSeconds = 24 * contactHourWindowSeconds

const getContactableListingSql = `
  select
    listing.id::text,
    listing.title,
    owner.id::text as owner_user_id,
    owner.email as owner_email,
    owner.display_name as owner_display_name
  from listings listing
  join users owner on owner.id = listing.owner_user_id
  where listing.id = $1::uuid
    and listing.moderation_status = 'approved'
    and listing.lifecycle_status = 'published'
    and listing.contact_requests_enabled = true
    and listing.deleted_at is null
    and (listing.expires_at is null or listing.expires_at > now())
    and owner.deleted_at is null
  limit 1
`

const createContactRequestSql = `
  insert into listing_contact_requests (
    listing_id,
    requester_user_id,
    owner_user_id,
    requester_display_name_snapshot,
    message,
    status,
    email_shared
  )
  values (
    $1::uuid,
    $2::uuid,
    $3::uuid,
    $4::text,
    $5::text,
    'pending',
    true
  )
  returning id::text
`

const countRecentContactRequestsSql = `
  select
    count(*) filter (
      where requester_user_id = $1::uuid
        and created_at >= now() - ($4::int * interval '1 second')
    )::int as requester_hour_count,
    count(*) filter (
      where requester_user_id = $1::uuid
        and created_at >= now() - ($5::int * interval '1 second')
    )::int as requester_day_count,
    count(*) filter (
      where requester_user_id = $1::uuid
        and listing_id = $2::uuid
        and created_at >= now() - ($5::int * interval '1 second')
    )::int as listing_day_count,
    count(*) filter (
      where owner_user_id = $3::uuid
        and created_at >= now() - ($4::int * interval '1 second')
    )::int as owner_hour_count
  from listing_contact_requests
  where created_at >= now() - ($5::int * interval '1 second')
    and (
      requester_user_id = $1::uuid
      or owner_user_id = $3::uuid
    )
`

const markContactRequestSentSql = `
  update listing_contact_requests
  set status = 'sent',
      delivered_at = now(),
      updated_at = now()
  where id = $1::uuid
  returning
    id::text,
    listing_id::text,
    requester_user_id::text,
    owner_user_id::text,
    status::text as status,
    email_shared,
    created_at,
    delivered_at
`

const markContactRequestFailedSql = `
  update listing_contact_requests
  set status = 'failed',
      failed_at = now(),
      failure_reason = $2::text,
      updated_at = now()
  where id = $1::uuid
  returning id::text
`

const listReceivedContactRequestsSql = `
  select
    count(*) over()::int as total_count,
    contact_request.id::text,
    contact_request.listing_id::text,
    listing.title as listing_title,
    contact_request.requester_user_id::text,
    case
      when contact_request.email_shared = true then requester.email
      else null
    end as requester_email,
    contact_request.requester_display_name_snapshot,
    contact_request.message,
    contact_request.status::text as status,
    contact_request.email_shared,
    contact_request.created_at,
    contact_request.delivered_at,
    contact_request.failed_at,
    contact_request.failure_reason
  from listing_contact_requests contact_request
  join listings listing on listing.id = contact_request.listing_id
  join users requester on requester.id = contact_request.requester_user_id
  where contact_request.owner_user_id = $1::uuid
  order by contact_request.created_at desc, contact_request.id desc
  limit $2::int
  offset $3::int
`

@Injectable()
export class ContactsService {
  constructor(
    @Inject(DatabaseService)
    private readonly databaseService: DatabaseService,
    @Inject(MailService)
    private readonly mailService: MailService
  ) {}

  async contactListingOwner(
    requester: AuthUser,
    listingId: string,
    input: ListingContactCreateInput
  ): Promise<ListingContactRequestResponse> {
    const [listing] =
      await this.databaseService.queryRows<ContactableListingRow>(
        getContactableListingSql,
        [listingId]
      )

    if (!listing) {
      throw new NotFoundException("Contactable listing not found.")
    }

    if (listing.owner_user_id === requester.id) {
      throw new BadRequestException("Users cannot contact their own listing.")
    }

    await this.enforceContactRateLimits(requester.id, listing)

    const [createdRequest] = await this.databaseService.queryRows<{
      id: string
    }>(createContactRequestSql, [
      listing.id,
      requester.id,
      listing.owner_user_id,
      requester.displayName,
      input.message,
    ])

    if (!createdRequest) {
      throw new InternalServerErrorException(
        "Unable to create contact request."
      )
    }

    try {
      await this.mailService.sendListingContactRequest({
        listingId: listing.id,
        listingTitle: listing.title,
        message: input.message,
        ownerDisplayName: listing.owner_display_name,
        requesterDisplayName: requester.displayName,
        requesterEmail: requester.email,
        to: listing.owner_email,
      })
    } catch (error) {
      await this.markContactRequestFailed(createdRequest.id, error)

      throw new InternalServerErrorException(
        "Unable to deliver contact request."
      )
    }

    const [sentRequest] =
      await this.databaseService.queryRows<ContactRequestRow>(
        markContactRequestSentSql,
        [createdRequest.id]
      )

    if (!sentRequest) {
      throw new InternalServerErrorException(
        "Unable to finalize contact request."
      )
    }

    return {
      sent: true,
      request: mapContactRequestRow(sentRequest),
    }
  }

  async listReceivedContactRequests(
    ownerUserId: string,
    query: ListingContactRequestListQuery
  ): Promise<ReceivedListingContactRequestListResponse> {
    const rows =
      await this.databaseService.queryRows<ReceivedContactRequestRow>(
        listReceivedContactRequestsSql,
        [ownerUserId, query.pageSize, (query.page - 1) * query.pageSize]
      )
    const total = rows[0] ? Number(rows[0].total_count) : 0

    return {
      items: rows.map(mapReceivedContactRequestRow),
      meta: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.ceil(total / query.pageSize),
      },
    }
  }

  private async markContactRequestFailed(requestId: string, error: unknown) {
    await this.databaseService.queryRows<FailedContactRequestRow>(
      markContactRequestFailedSql,
      [
        requestId,
        error instanceof Error ? error.message.slice(0, 500) : "Unknown error",
      ]
    )
  }

  private async enforceContactRateLimits(
    requesterUserId: string,
    listing: ContactableListingRow
  ) {
    const [rateLimit] =
      await this.databaseService.queryRows<ContactRateLimitRow>(
        countRecentContactRequestsSql,
        [
          requesterUserId,
          listing.id,
          listing.owner_user_id,
          contactHourWindowSeconds,
          contactDayWindowSeconds,
        ]
      )

    const counts = {
      requesterHour: Number(rateLimit?.requester_hour_count ?? 0),
      requesterDay: Number(rateLimit?.requester_day_count ?? 0),
      listingDay: Number(rateLimit?.listing_day_count ?? 0),
      ownerHour: Number(rateLimit?.owner_hour_count ?? 0),
    }

    if (counts.listingDay >= requesterListingDailyContactLimit) {
      throwContactRateLimitExceeded(
        "listing_contact_cooldown",
        contactDayWindowSeconds
      )
    }

    if (counts.requesterHour >= requesterHourlyContactLimit) {
      throwContactRateLimitExceeded(
        "requester_hourly_limit",
        contactHourWindowSeconds
      )
    }

    if (counts.requesterDay >= requesterDailyContactLimit) {
      throwContactRateLimitExceeded(
        "requester_daily_limit",
        contactDayWindowSeconds
      )
    }

    if (counts.ownerHour >= ownerHourlyContactLimit) {
      throwContactRateLimitExceeded(
        "owner_hourly_limit",
        contactHourWindowSeconds
      )
    }
  }
}

function throwContactRateLimitExceeded(
  reason: string,
  retryAfterSeconds: number
) {
  throw new HttpException(
    {
      message: "Contact request rate limit exceeded.",
      reason,
      retryAfterSeconds,
    },
    HttpStatus.TOO_MANY_REQUESTS
  )
}

function mapContactRequestRow(row: ContactRequestRow): ListingContactRequest {
  return {
    id: row.id,
    listingId: row.listing_id,
    requesterUserId: row.requester_user_id,
    ownerUserId: row.owner_user_id,
    status: row.status,
    emailShared: row.email_shared,
    createdAt: toIsoString(row.created_at),
    deliveredAt: toIsoString(row.delivered_at),
  }
}

function mapReceivedContactRequestRow(
  row: ReceivedContactRequestRow
): ReceivedListingContactRequest {
  return {
    id: row.id,
    listing: {
      id: row.listing_id,
      title: row.listing_title,
    },
    requester: {
      id: row.requester_user_id,
      displayName: row.requester_display_name_snapshot,
      email: row.requester_email,
    },
    message: row.message,
    status: row.status,
    emailShared: row.email_shared,
    createdAt: toIsoString(row.created_at),
    deliveredAt: toIsoStringOrNull(row.delivered_at),
    failedAt: toIsoStringOrNull(row.failed_at),
    failureReason: row.failure_reason,
  }
}

function toIsoString(value: Date | string) {
  return new Date(value).toISOString()
}

function toIsoStringOrNull(value: Date | string | null) {
  return value === null ? null : toIsoString(value)
}
