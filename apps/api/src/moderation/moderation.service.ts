import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common"
import type {
  ModerationDecisionInput,
  PaginationQuery,
} from "@workspace/validation"

import { DatabaseService } from "../database/database.service.js"
import { MailService } from "../mail/mail.service.js"
import type {
  ListingLifecycleStatus,
  ListingModerationStatus,
  ModerationDecisionAction,
  ModerationDecisionResponse,
  ModerationQueueItem,
  ModerationQueueResponse,
  ReportResolutionStatus,
  ReportedListingQueueItem,
  ReportedListingQueueResponse,
} from "./moderation.types.js"

type ModeratorRoleRow = {
  role_code: string
}

type PendingReviewQueueRow = {
  total_count: number | string
  case_id: string
  case_status: "open"
  case_reason_code: string | null
  case_created_at: Date | string
  assigned_to_user_id: string | null
  listing_id: string
  listing_title: string
  listing_slug: string
  listing_description: string
  listing_moderation_status: "pending_review"
  listing_lifecycle_status: "draft"
  listing_created_at: Date | string
  listing_updated_at: Date | string
  owner_user_id: string
  owner_email: string
  owner_display_name: string
  municipality_id: string | null
  municipality_name: string | null
  municipality_istat_code: string | null
  province_id: string | null
  province_name: string | null
  province_istat_code: string | null
  region_id: string | null
  region_name: string | null
  region_istat_code: string | null
  ready_image_count: number | string
  cover_image_id: string | null
  cover_object_key_thumb: string | null
  cover_object_key_large: string | null
}

type ReportedListingQueueRow = {
  total_count: number | string
  case_id: string
  case_status: "open"
  case_reason_code: string | null
  case_created_at: Date | string
  assigned_to_user_id: string | null
  listing_id: string
  listing_title: string
  listing_slug: string
  listing_description: string
  listing_moderation_status: ListingModerationStatus
  listing_lifecycle_status: ListingLifecycleStatus
  listing_published_at: Date | string | null
  listing_expires_at: Date | string | null
  listing_created_at: Date | string
  listing_updated_at: Date | string
  owner_user_id: string
  owner_email: string
  owner_display_name: string
  municipality_id: string | null
  municipality_name: string | null
  municipality_istat_code: string | null
  province_id: string | null
  province_name: string | null
  province_istat_code: string | null
  region_id: string | null
  region_name: string | null
  region_istat_code: string | null
  ready_image_count: number | string
  cover_image_id: string | null
  cover_object_key_thumb: string | null
  cover_object_key_large: string | null
  report_count: number | string
  first_reported_at: Date | string
  latest_reported_at: Date | string
  latest_report_id: string | null
  latest_reporter_user_id: string | null
  latest_reporter_email: string | null
  latest_reporter_display_name: string | null
  latest_report_reason_code: string | null
  latest_report_description: string | null
  latest_report_created_at: Date | string | null
}

type ModerationDecisionStatus = "approved" | "rejected" | "suspended"

type DecisionLifecycleStatus = "draft" | "published"

type ModerationDecisionConfig = {
  action: ModerationDecisionStatus
  listingModerationStatus: ModerationDecisionStatus
  listingLifecycleStatus: DecisionLifecycleStatus
  caseStatus: ModerationDecisionStatus
  reportStatus: ReportResolutionStatus
}

type ModerationDecisionRow = {
  case_id: string
  case_status: ModerationDecisionStatus
  case_closed_at: Date | string
  action_id: string
  listing_id: string
  listing_title: string
  listing_slug: string
  listing_moderation_status: ModerationDecisionStatus
  listing_lifecycle_status: DecisionLifecycleStatus
  listing_published_at: Date | string | null
  listing_updated_at: Date | string
  owner_email: string
  owner_display_name: string
  owner_listing_moderation_decision_email_enabled: boolean
  report_resolution_status: ReportResolutionStatus
  report_resolution_count: number | string
  report_notifications: unknown
}

type ReportNotification = {
  reportId: string
  reporterUserId: string
  reporterEmail: string
  reporterDisplayName: string
  reasonCode: string
}

const moderatorRoles = new Set(["admin", "moderator"])

const moderationDecisionConfigs = {
  approve: {
    action: "approved",
    listingModerationStatus: "approved",
    listingLifecycleStatus: "published",
    caseStatus: "approved",
    reportStatus: "dismissed",
  },
  reject: {
    action: "rejected",
    listingModerationStatus: "rejected",
    listingLifecycleStatus: "draft",
    caseStatus: "rejected",
    reportStatus: "resolved",
  },
  suspend: {
    action: "suspended",
    listingModerationStatus: "suspended",
    listingLifecycleStatus: "draft",
    caseStatus: "suspended",
    reportStatus: "resolved",
  },
} satisfies Record<ModerationDecisionAction, ModerationDecisionConfig>

const moderatorRolesSql = `
  select roles.code as role_code
  from user_roles
  join roles on roles.id = user_roles.role_id
  join users on users.id = user_roles.user_id
  where user_roles.user_id = $1::uuid
    and users.deleted_at is null
    and users.status in ('active', 'pending_verification')
`

const pendingReviewQueueSql = `
  with ready_images as (
    select
      listing_id,
      count(*)::int as ready_image_count
    from listing_images
    where status = 'ready'
      and deleted_at is null
    group by listing_id
  ),
  cover_images as (
    select distinct on (listing_id)
      listing_id,
      id::text as cover_image_id,
      object_key_thumb,
      object_key_large
    from listing_images
    where status = 'ready'
      and deleted_at is null
      and is_cover = true
    order by listing_id, sort_order, created_at
  )
  select
    count(*) over()::int as total_count,
    moderation_case.id::text as case_id,
    moderation_case.status::text as case_status,
    moderation_case.reason_code as case_reason_code,
    moderation_case.created_at as case_created_at,
    moderation_case.assigned_to_user_id::text as assigned_to_user_id,
    listing.id::text as listing_id,
    listing.title as listing_title,
    listing.slug as listing_slug,
    listing.description as listing_description,
    listing.moderation_status::text as listing_moderation_status,
    listing.lifecycle_status::text as listing_lifecycle_status,
    listing.created_at as listing_created_at,
    listing.updated_at as listing_updated_at,
    owner.id::text as owner_user_id,
    owner.email as owner_email,
    owner.display_name as owner_display_name,
    municipality.id::text as municipality_id,
    municipality.name as municipality_name,
    municipality.istat_code as municipality_istat_code,
    province.id::text as province_id,
    province.name as province_name,
    province.istat_code as province_istat_code,
    region.id::text as region_id,
    region.name as region_name,
    region.istat_code as region_istat_code,
    coalesce(ready_images.ready_image_count, 0)::int as ready_image_count,
    cover_images.cover_image_id,
    cover_images.object_key_thumb as cover_object_key_thumb,
    cover_images.object_key_large as cover_object_key_large
  from moderation_cases moderation_case
  join listings listing on listing.id = moderation_case.listing_id
  join users owner on owner.id = listing.owner_user_id
  left join geo_municipalities municipality
    on municipality.id = listing.municipality_id
  left join geo_provinces province on province.id = listing.province_id
  left join geo_regions region on region.id = listing.region_id
  left join ready_images on ready_images.listing_id = listing.id
  left join cover_images on cover_images.listing_id = listing.id
  where moderation_case.status = 'open'
    and listing.moderation_status = 'pending_review'
    and listing.lifecycle_status = 'draft'
    and listing.deleted_at is null
    and owner.deleted_at is null
  order by moderation_case.created_at asc, listing.updated_at asc
  limit $1::int
  offset $2::int
`

const reportedListingsQueueSql = `
  with ready_images as (
    select
      listing_id,
      count(*)::int as ready_image_count
    from listing_images
    where status = 'ready'
      and deleted_at is null
    group by listing_id
  ),
  cover_images as (
    select distinct on (listing_id)
      listing_id,
      id::text as cover_image_id,
      object_key_thumb,
      object_key_large
    from listing_images
    where status = 'ready'
      and deleted_at is null
      and is_cover = true
    order by listing_id, sort_order, created_at
  ),
  report_summaries as (
    select
      moderation_case_id,
      count(*)::int as report_count,
      min(created_at) as first_reported_at,
      max(created_at) as latest_reported_at
    from reports
    where target_type = 'listing'
      and status = 'linked'
    group by moderation_case_id
  ),
  latest_reports as (
    select distinct on (report.moderation_case_id)
      report.moderation_case_id,
      report.id::text as latest_report_id,
      report.reporter_user_id::text as latest_reporter_user_id,
      reporter.email as latest_reporter_email,
      reporter.display_name as latest_reporter_display_name,
      report.reason_code as latest_report_reason_code,
      report.description as latest_report_description,
      report.created_at as latest_report_created_at
    from reports report
    left join users reporter on reporter.id = report.reporter_user_id
    where report.target_type = 'listing'
      and report.status = 'linked'
    order by report.moderation_case_id, report.created_at desc, report.id desc
  )
  select
    count(*) over()::int as total_count,
    moderation_case.id::text as case_id,
    moderation_case.status::text as case_status,
    moderation_case.reason_code as case_reason_code,
    moderation_case.created_at as case_created_at,
    moderation_case.assigned_to_user_id::text as assigned_to_user_id,
    listing.id::text as listing_id,
    listing.title as listing_title,
    listing.slug as listing_slug,
    listing.description as listing_description,
    listing.moderation_status::text as listing_moderation_status,
    listing.lifecycle_status::text as listing_lifecycle_status,
    listing.published_at as listing_published_at,
    listing.expires_at as listing_expires_at,
    listing.created_at as listing_created_at,
    listing.updated_at as listing_updated_at,
    owner.id::text as owner_user_id,
    owner.email as owner_email,
    owner.display_name as owner_display_name,
    municipality.id::text as municipality_id,
    municipality.name as municipality_name,
    municipality.istat_code as municipality_istat_code,
    province.id::text as province_id,
    province.name as province_name,
    province.istat_code as province_istat_code,
    region.id::text as region_id,
    region.name as region_name,
    region.istat_code as region_istat_code,
    coalesce(ready_images.ready_image_count, 0)::int as ready_image_count,
    cover_images.cover_image_id,
    cover_images.object_key_thumb as cover_object_key_thumb,
    cover_images.object_key_large as cover_object_key_large,
    report_summaries.report_count,
    report_summaries.first_reported_at,
    report_summaries.latest_reported_at,
    latest_reports.latest_report_id,
    latest_reports.latest_reporter_user_id,
    latest_reports.latest_reporter_email,
    latest_reports.latest_reporter_display_name,
    latest_reports.latest_report_reason_code,
    latest_reports.latest_report_description,
    latest_reports.latest_report_created_at
  from moderation_cases moderation_case
  join report_summaries
    on report_summaries.moderation_case_id = moderation_case.id
  join listings listing on listing.id = moderation_case.listing_id
  join users owner on owner.id = listing.owner_user_id
  left join geo_municipalities municipality
    on municipality.id = listing.municipality_id
  left join geo_provinces province on province.id = listing.province_id
  left join geo_regions region on region.id = listing.region_id
  left join ready_images on ready_images.listing_id = listing.id
  left join cover_images on cover_images.listing_id = listing.id
  left join latest_reports
    on latest_reports.moderation_case_id = moderation_case.id
  where moderation_case.status = 'open'
    and listing.deleted_at is null
    and owner.deleted_at is null
  order by report_summaries.first_reported_at asc, moderation_case.created_at asc
  limit $1::int
  offset $2::int
`

const decideListingCaseSql = `
  with target_case as (
    select
      moderation_case.id,
      moderation_case.listing_id,
      listing.title,
      listing.slug,
      listing.moderation_status::text as from_status,
      owner.email as owner_email,
      owner.display_name as owner_display_name,
      coalesce(
        owner_notification_preferences.listing_moderation_decision_email_enabled,
        true
      ) as owner_listing_moderation_decision_email_enabled
    from moderation_cases moderation_case
    join listings listing on listing.id = moderation_case.listing_id
    join users owner on owner.id = listing.owner_user_id
    left join user_notification_preferences owner_notification_preferences
      on owner_notification_preferences.user_id = owner.id
    where moderation_case.id = $1::uuid
      and moderation_case.status = 'open'
      and listing.moderation_status in ('pending_review', 'approved')
      and listing.lifecycle_status in ('draft', 'published')
      and listing.deleted_at is null
      and owner.deleted_at is null
    for update of moderation_case, listing
  ),
  updated_listing as (
    update listings
    set
      moderation_status = $3::listing_moderation_status,
      lifecycle_status = $4::listing_lifecycle_status,
      published_at = case
        when $3::text = 'approved' then coalesce(published_at, now())
        else published_at
      end,
      updated_at = now()
    from target_case
    where listings.id = target_case.listing_id
    returning
      listings.id::text,
      listings.moderation_status::text as moderation_status,
      listings.lifecycle_status::text as lifecycle_status,
      listings.published_at,
      listings.updated_at
  ),
  updated_case as (
    update moderation_cases
    set
      status = $5::moderation_case_status,
      assigned_to_user_id = $2::uuid,
      closed_at = now(),
      updated_at = now()
    from target_case
    where moderation_cases.id = target_case.id
    returning
      moderation_cases.id::text,
      moderation_cases.listing_id::text,
      moderation_cases.status::text as status,
      moderation_cases.closed_at
  ),
  inserted_action as (
    insert into moderation_actions (
      case_id,
      actor_user_id,
      action,
      reason_code,
      reason_text,
      from_status,
      to_status,
      metadata
    )
    select
      target_case.id,
      $2::uuid,
      $6::moderation_action_type,
      $7::text,
      $8::text,
      target_case.from_status::listing_moderation_status,
      $3::listing_moderation_status,
      jsonb_build_object(
        'listingLifecycleStatus',
        $4::text,
        'linkedReportStatus',
        $9::text
      )
    from target_case
    returning id::text
  ),
  active_reports as (
    select
      reports.id,
      reports.reason_code,
      reporter.id::text as reporter_user_id,
      reporter.email as reporter_email,
      reporter.display_name as reporter_display_name,
      coalesce(
        reporter_notification_preferences.listing_report_decision_email_enabled,
        true
      ) as reporter_listing_report_decision_email_enabled
    from reports
    join target_case on target_case.id = reports.moderation_case_id
    left join users reporter
      on reporter.id = reports.reporter_user_id
      and reporter.deleted_at is null
    left join user_notification_preferences reporter_notification_preferences
      on reporter_notification_preferences.user_id = reporter.id
    where reports.status in ('open', 'linked')
  ),
  updated_reports as (
    update reports
    set
      status = $9::report_status,
      resolved_at = now(),
      updated_at = now()
    where reports.id in (select id from active_reports)
    returning reports.id
  ),
  report_resolution as (
    select
      count(updated_reports.id)::int as report_resolution_count,
      coalesce(
        jsonb_agg(
          jsonb_build_object(
            'reportId',
            active_reports.id::text,
            'reporterUserId',
            active_reports.reporter_user_id,
            'reporterEmail',
            active_reports.reporter_email,
            'reporterDisplayName',
            active_reports.reporter_display_name,
            'reasonCode',
            active_reports.reason_code
          )
        ) filter (
          where active_reports.reporter_email is not null
            and updated_reports.id is not null
            and active_reports.reporter_listing_report_decision_email_enabled
        ),
        '[]'::jsonb
      ) as report_notifications
    from active_reports
    left join updated_reports on updated_reports.id = active_reports.id
  )
  select
    updated_case.id as case_id,
    updated_case.status as case_status,
    updated_case.closed_at as case_closed_at,
    inserted_action.id as action_id,
    updated_listing.id as listing_id,
    target_case.title as listing_title,
    target_case.slug as listing_slug,
    updated_listing.moderation_status as listing_moderation_status,
    updated_listing.lifecycle_status as listing_lifecycle_status,
    updated_listing.published_at as listing_published_at,
    updated_listing.updated_at as listing_updated_at,
    target_case.owner_email,
    target_case.owner_display_name,
    target_case.owner_listing_moderation_decision_email_enabled,
    $9::text as report_resolution_status,
    report_resolution.report_resolution_count,
    report_resolution.report_notifications
  from updated_case
  join target_case on target_case.id = updated_case.id::uuid
  join updated_listing on updated_listing.id = updated_case.listing_id
  join inserted_action on true
  join report_resolution on true
`

@Injectable()
export class ModerationService {
  constructor(
    @Inject(DatabaseService)
    private readonly databaseService: DatabaseService,
    @Inject(MailService)
    private readonly mailService: MailService
  ) {}

  async pendingReviewQueue(
    moderatorUserId: string,
    query: PaginationQuery
  ): Promise<ModerationQueueResponse> {
    await this.assertCanModerate(moderatorUserId)

    const rows = await this.databaseService.queryRows<PendingReviewQueueRow>(
      pendingReviewQueueSql,
      [query.pageSize, (query.page - 1) * query.pageSize]
    )
    const total = rows[0] ? Number(rows[0].total_count) : 0

    return {
      items: rows.map(mapQueueRow),
      meta: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.ceil(total / query.pageSize),
      },
    }
  }

  async reportedListingsQueue(
    moderatorUserId: string,
    query: PaginationQuery
  ): Promise<ReportedListingQueueResponse> {
    await this.assertCanModerate(moderatorUserId)

    const rows = await this.databaseService.queryRows<ReportedListingQueueRow>(
      reportedListingsQueueSql,
      [query.pageSize, (query.page - 1) * query.pageSize]
    )
    const total = rows[0] ? Number(rows[0].total_count) : 0

    return {
      items: rows.map(mapReportedListingRow),
      meta: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.ceil(total / query.pageSize),
      },
    }
  }

  async decideListingCase(
    moderatorUserId: string,
    caseId: string,
    decision: ModerationDecisionAction,
    input: ModerationDecisionInput
  ): Promise<ModerationDecisionResponse> {
    await this.assertCanModerate(moderatorUserId)
    assertDecisionReason(input)

    const config = moderationDecisionConfigs[decision]
    const [row] = await this.databaseService.queryRows<ModerationDecisionRow>(
      decideListingCaseSql,
      [
        caseId,
        moderatorUserId,
        config.listingModerationStatus,
        config.listingLifecycleStatus,
        config.caseStatus,
        config.action,
        input.reasonCode ?? null,
        input.reasonText ?? null,
        config.reportStatus,
      ]
    )

    if (!row) {
      throw new NotFoundException("Moderation case not found or not decidable.")
    }

    const response = mapDecisionRow(row, config.action, input)

    await this.sendDecisionNotifications(row, config.action, input)

    return response
  }

  private async assertCanModerate(userId: string) {
    const rows = await this.databaseService.queryRows<ModeratorRoleRow>(
      moderatorRolesSql,
      [userId]
    )

    if (!rows.some((row) => moderatorRoles.has(row.role_code))) {
      throw new ForbiddenException("Moderator role required.")
    }
  }

  private async sendDecisionNotifications(
    row: ModerationDecisionRow,
    action: ModerationDecisionStatus,
    input: ModerationDecisionInput
  ) {
    const message = {
      decision: action,
      listingSlug: row.listing_slug,
      listingTitle: row.listing_title,
      reasonCode: input.reasonCode ?? null,
      reasonText: input.reasonText ?? null,
    }

    if (row.owner_listing_moderation_decision_email_enabled) {
      await this.mailService.sendListingModerationDecision({
        ...message,
        displayName: row.owner_display_name,
        to: row.owner_email,
      })
    }

    await Promise.all(
      parseReportNotifications(row.report_notifications).map((report) =>
        this.mailService.sendListingReportDecision({
          ...message,
          displayName: report.reporterDisplayName,
          reportResolutionStatus: row.report_resolution_status,
          to: report.reporterEmail,
        })
      )
    )
  }
}

function assertDecisionReason(input: ModerationDecisionInput) {
  if (!input.reasonCode && !input.reasonText) {
    throw new BadRequestException("A moderation decision requires a reason.")
  }
}

function mapQueueRow(row: PendingReviewQueueRow): ModerationQueueItem {
  return {
    case: {
      id: row.case_id,
      status: row.case_status,
      reasonCode: row.case_reason_code,
      openedAt: toIsoString(row.case_created_at),
      assignedToUserId: row.assigned_to_user_id,
    },
    listing: {
      id: row.listing_id,
      title: row.listing_title,
      slug: row.listing_slug,
      description: row.listing_description,
      moderationStatus: row.listing_moderation_status,
      lifecycleStatus: row.listing_lifecycle_status,
      createdAt: toIsoString(row.listing_created_at),
      updatedAt: toIsoString(row.listing_updated_at),
    },
    owner: {
      id: row.owner_user_id,
      email: row.owner_email,
      displayName: row.owner_display_name,
    },
    location: mapLocation(row),
    images: {
      readyCount: Number(row.ready_image_count),
      cover: row.cover_image_id
        ? {
            id: row.cover_image_id,
            objectKeyThumb: row.cover_object_key_thumb,
            objectKeyLarge: row.cover_object_key_large,
          }
        : null,
    },
  }
}

function mapReportedListingRow(
  row: ReportedListingQueueRow
): ReportedListingQueueItem {
  return {
    case: {
      id: row.case_id,
      status: row.case_status,
      reasonCode: row.case_reason_code,
      openedAt: toIsoString(row.case_created_at),
      assignedToUserId: row.assigned_to_user_id,
    },
    listing: {
      id: row.listing_id,
      title: row.listing_title,
      slug: row.listing_slug,
      description: row.listing_description,
      moderationStatus: row.listing_moderation_status,
      lifecycleStatus: row.listing_lifecycle_status,
      publishedAt: toIsoStringOrNull(row.listing_published_at),
      expiresAt: toIsoStringOrNull(row.listing_expires_at),
      createdAt: toIsoString(row.listing_created_at),
      updatedAt: toIsoString(row.listing_updated_at),
    },
    owner: {
      id: row.owner_user_id,
      email: row.owner_email,
      displayName: row.owner_display_name,
    },
    location: mapLocation(row),
    images: {
      readyCount: Number(row.ready_image_count),
      cover: row.cover_image_id
        ? {
            id: row.cover_image_id,
            objectKeyThumb: row.cover_object_key_thumb,
            objectKeyLarge: row.cover_object_key_large,
          }
        : null,
    },
    reports: {
      count: Number(row.report_count),
      firstReportedAt: toIsoString(row.first_reported_at),
      latestReportedAt: toIsoString(row.latest_reported_at),
      latest:
        row.latest_report_id &&
        row.latest_report_reason_code &&
        row.latest_report_created_at
          ? {
              id: row.latest_report_id,
              reporterUserId: row.latest_reporter_user_id,
              reporterEmail: row.latest_reporter_email,
              reporterDisplayName: row.latest_reporter_display_name,
              reasonCode: row.latest_report_reason_code,
              description: row.latest_report_description,
              createdAt: toIsoString(row.latest_report_created_at),
            }
          : null,
    },
  }
}

function mapLocation(
  row: PendingReviewQueueRow | ReportedListingQueueRow
): ModerationQueueItem["location"] {
  if (
    !row.municipality_id ||
    !row.municipality_name ||
    !row.municipality_istat_code ||
    !row.province_id ||
    !row.province_name ||
    !row.province_istat_code ||
    !row.region_id ||
    !row.region_name ||
    !row.region_istat_code
  ) {
    return null
  }

  return {
    municipality: {
      id: row.municipality_id,
      name: row.municipality_name,
      istatCode: row.municipality_istat_code,
    },
    province: {
      id: row.province_id,
      name: row.province_name,
      istatCode: row.province_istat_code,
    },
    region: {
      id: row.region_id,
      name: row.region_name,
      istatCode: row.region_istat_code,
    },
  }
}

function toIsoString(value: Date | string) {
  return new Date(value).toISOString()
}

function toIsoStringOrNull(value: Date | string | null) {
  return value === null ? null : toIsoString(value)
}

function mapDecisionRow(
  row: ModerationDecisionRow,
  action: ModerationDecisionStatus,
  input: ModerationDecisionInput
): ModerationDecisionResponse {
  return {
    decided: true,
    decision: {
      action,
      reasonCode: input.reasonCode ?? null,
      reasonText: input.reasonText ?? null,
    },
    action: {
      id: row.action_id,
    },
    case: {
      id: row.case_id,
      status: row.case_status,
      closedAt: toIsoString(row.case_closed_at),
    },
    listing: {
      id: row.listing_id,
      moderationStatus: row.listing_moderation_status,
      lifecycleStatus: row.listing_lifecycle_status,
      publishedAt: toIsoStringOrNull(row.listing_published_at),
      updatedAt: toIsoString(row.listing_updated_at),
    },
    reports: {
      status: row.report_resolution_status,
      count: Number(row.report_resolution_count),
    },
  }
}

function parseReportNotifications(value: unknown): ReportNotification[] {
  const parsed = typeof value === "string" ? parseJson(value) : value

  if (!Array.isArray(parsed)) {
    return []
  }

  return parsed.filter(isReportNotification)
}

function parseJson(value: string): unknown {
  try {
    return JSON.parse(value)
  } catch {
    return []
  }
}

function isReportNotification(value: unknown): value is ReportNotification {
  return (
    typeof value === "object" &&
    value !== null &&
    "reportId" in value &&
    typeof value.reportId === "string" &&
    "reporterUserId" in value &&
    typeof value.reporterUserId === "string" &&
    "reporterEmail" in value &&
    typeof value.reporterEmail === "string" &&
    "reporterDisplayName" in value &&
    typeof value.reporterDisplayName === "string" &&
    "reasonCode" in value &&
    typeof value.reasonCode === "string"
  )
}
