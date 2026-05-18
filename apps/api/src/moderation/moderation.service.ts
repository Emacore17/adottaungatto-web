import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common"
import type {
  ModerationCommentInput,
  ModerationDecisionInput,
  PaginationQuery,
} from "@workspace/validation"

import { DatabaseService } from "../database/database.service.js"
import { ListingSearchDocumentsService } from "../listing-search-documents/listing-search-documents.service.js"
import { MailService } from "../mail/mail.service.js"
import { NotificationsService } from "../notifications/notifications.service.js"
import type {
  ListingLifecycleStatus,
  ModerationCaseStatus,
  ModerationClaimResponse,
  ModerationCommentResponse,
  ListingModerationStatus,
  ModerationDecisionAction,
  ModerationDecisionResponse,
  ModerationAuditAction,
  ModerationQueueItem,
  ModerationQueueResponse,
  ModerationRecentActionItem,
  ModerationRecentActionsResponse,
  ReportResolutionStatus,
  ReportedListingQueueItem,
  ReportedListingQueueResponse,
} from "./moderation.types.js"

type PendingReviewQueueRow = {
  total_count: number | string
  case_id: string
  case_status: "open"
  case_reason_code: string | null
  case_created_at: Date | string
  assigned_to_user_id: string | null
  assigned_to_user_email: string | null
  assigned_to_user_display_name: string | null
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
  preview_images: unknown
  audit_actions: unknown
}

type ReportedListingQueueRow = {
  total_count: number | string
  case_id: string
  case_status: "open"
  case_reason_code: string | null
  case_created_at: Date | string
  assigned_to_user_id: string | null
  assigned_to_user_email: string | null
  assigned_to_user_display_name: string | null
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
  preview_images: unknown
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
  audit_actions: unknown
}

type RecentModerationActionRow = {
  total_count: number | string
  action_id: string
  action_type: ModerationRecentActionItem["action"]["type"]
  action_reason_code: string | null
  action_reason_text: string | null
  action_from_status: ListingModerationStatus | null
  action_to_status: ListingModerationStatus | null
  action_created_at: Date | string
  case_id: string
  case_status: ModerationRecentActionItem["case"]["status"]
  assigned_to_user_id: string | null
  assigned_to_user_email: string | null
  assigned_to_user_display_name: string | null
  listing_id: string
  listing_title: string
  listing_slug: string
  listing_moderation_status: ListingModerationStatus
  listing_lifecycle_status: ListingLifecycleStatus
  owner_user_id: string
  owner_email: string
  owner_display_name: string
  actor_user_id: string | null
  actor_email: string | null
  actor_display_name: string | null
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

type ModerationDecisionOptions = {
  canOverrideAssignment?: boolean
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
  owner_user_id: string
  owner_email: string
  owner_display_name: string
  owner_listing_moderation_decision_email_enabled: boolean
  report_resolution_status: ReportResolutionStatus
  report_resolution_count: number | string
  report_notifications: unknown
}

type ModerationDecisionStateRow = {
  assigned_to_user_id: string | null
  case_id: string
  case_status: ModerationCaseStatus
  listing_deleted: boolean
  listing_id: string
  listing_lifecycle_status: ListingLifecycleStatus
  listing_moderation_status: ListingModerationStatus
  owner_deleted: boolean
}

type ReportNotification = {
  reportId: string
  reporterUserId: string
  reporterEmail: string
  reporterDisplayName: string
  listingReportDecisionEmailEnabled: boolean
  reasonCode: string
}

type ModerationClaimRow = {
  action_id: string | null
  assigned_to_user_id: string | null
  case_id: string
  previous_assigned_to_user_id: string | null
  updated_at: Date | string | null
}

type ModerationCommentRow = {
  action_created_at: Date | string
  action_id: string
  case_id: string
  case_status: ModerationCommentResponse["case"]["status"]
  comment_text: string
  updated_at: Date | string
}

const moderationAuditActionTypes = new Set([
  "opened",
  "assigned",
  "approved",
  "rejected",
  "suspended",
  "closed",
  "commented",
  "reported",
])

const listingModerationStatuses = new Set([
  "draft",
  "pending_review",
  "approved",
  "rejected",
  "suspended",
])

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
  ),
  preview_images as (
    select
      listing_id,
      jsonb_agg(
        jsonb_build_object(
          'id',
          id::text,
          'objectKeyThumb',
          object_key_thumb,
          'objectKeyLarge',
          object_key_large,
          'isCover',
          is_cover,
          'sortOrder',
          sort_order
        )
        order by is_cover desc, sort_order asc, created_at asc, id asc
      ) as preview_images
    from (
      select
        listing_images.*,
        row_number() over (
          partition by listing_id
          order by is_cover desc, sort_order asc, created_at asc, id asc
        ) as image_rank
      from listing_images
      where status = 'ready'
        and deleted_at is null
    ) listing_images
    where image_rank <= 8
    group by listing_id
  ),
  audit_action_summaries as (
    select
      ranked_action.case_id,
      jsonb_agg(
        jsonb_build_object(
          'id',
          ranked_action.id::text,
          'action',
          ranked_action.action::text,
          'reasonCode',
          ranked_action.reason_code,
          'reasonText',
          ranked_action.reason_text,
          'fromStatus',
          ranked_action.from_status::text,
          'toStatus',
          ranked_action.to_status::text,
          'createdAt',
          ranked_action.created_at,
          'actor',
          case
            when actor.id is null then null
            else jsonb_build_object(
              'id',
              actor.id::text,
              'email',
              actor.email,
              'displayName',
              actor.display_name
            )
          end
        )
        order by ranked_action.created_at desc, ranked_action.id desc
      ) as audit_actions
    from (
      select
        moderation_action.*,
        row_number() over (
          partition by moderation_action.case_id
          order by moderation_action.created_at desc, moderation_action.id desc
        ) as action_rank
      from moderation_actions moderation_action
    ) ranked_action
    left join users actor on actor.id = ranked_action.actor_user_id
    where ranked_action.action_rank <= 5
    group by ranked_action.case_id
  )
  select
    count(*) over()::int as total_count,
    moderation_case.id::text as case_id,
    moderation_case.status::text as case_status,
    moderation_case.reason_code as case_reason_code,
    moderation_case.created_at as case_created_at,
    moderation_case.assigned_to_user_id::text as assigned_to_user_id,
    assignee.email as assigned_to_user_email,
    assignee.display_name as assigned_to_user_display_name,
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
    cover_images.object_key_large as cover_object_key_large,
    coalesce(preview_images.preview_images, '[]'::jsonb) as preview_images,
    coalesce(
      audit_action_summaries.audit_actions,
      '[]'::jsonb
    ) as audit_actions
  from moderation_cases moderation_case
  join listings listing on listing.id = moderation_case.listing_id
  join users owner on owner.id = listing.owner_user_id
  left join users assignee on assignee.id = moderation_case.assigned_to_user_id
  left join geo_municipalities municipality
    on municipality.id = listing.municipality_id
  left join geo_provinces province on province.id = listing.province_id
  left join geo_regions region on region.id = listing.region_id
  left join ready_images on ready_images.listing_id = listing.id
  left join cover_images on cover_images.listing_id = listing.id
  left join preview_images on preview_images.listing_id = listing.id
  left join audit_action_summaries
    on audit_action_summaries.case_id = moderation_case.id
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
  preview_images as (
    select
      listing_id,
      jsonb_agg(
        jsonb_build_object(
          'id',
          id::text,
          'objectKeyThumb',
          object_key_thumb,
          'objectKeyLarge',
          object_key_large,
          'isCover',
          is_cover,
          'sortOrder',
          sort_order
        )
        order by is_cover desc, sort_order asc, created_at asc, id asc
      ) as preview_images
    from (
      select
        listing_images.*,
        row_number() over (
          partition by listing_id
          order by is_cover desc, sort_order asc, created_at asc, id asc
        ) as image_rank
      from listing_images
      where status = 'ready'
        and deleted_at is null
    ) listing_images
    where image_rank <= 8
    group by listing_id
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
  ),
  audit_action_summaries as (
    select
      ranked_action.case_id,
      jsonb_agg(
        jsonb_build_object(
          'id',
          ranked_action.id::text,
          'action',
          ranked_action.action::text,
          'reasonCode',
          ranked_action.reason_code,
          'reasonText',
          ranked_action.reason_text,
          'fromStatus',
          ranked_action.from_status::text,
          'toStatus',
          ranked_action.to_status::text,
          'createdAt',
          ranked_action.created_at,
          'actor',
          case
            when actor.id is null then null
            else jsonb_build_object(
              'id',
              actor.id::text,
              'email',
              actor.email,
              'displayName',
              actor.display_name
            )
          end
        )
        order by ranked_action.created_at desc, ranked_action.id desc
      ) as audit_actions
    from (
      select
        moderation_action.*,
        row_number() over (
          partition by moderation_action.case_id
          order by moderation_action.created_at desc, moderation_action.id desc
        ) as action_rank
      from moderation_actions moderation_action
    ) ranked_action
    left join users actor on actor.id = ranked_action.actor_user_id
    where ranked_action.action_rank <= 5
    group by ranked_action.case_id
  )
  select
    count(*) over()::int as total_count,
    moderation_case.id::text as case_id,
    moderation_case.status::text as case_status,
    moderation_case.reason_code as case_reason_code,
    moderation_case.created_at as case_created_at,
    moderation_case.assigned_to_user_id::text as assigned_to_user_id,
    assignee.email as assigned_to_user_email,
    assignee.display_name as assigned_to_user_display_name,
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
    coalesce(preview_images.preview_images, '[]'::jsonb) as preview_images,
    report_summaries.report_count,
    report_summaries.first_reported_at,
    report_summaries.latest_reported_at,
    latest_reports.latest_report_id,
    latest_reports.latest_reporter_user_id,
    latest_reports.latest_reporter_email,
    latest_reports.latest_reporter_display_name,
    latest_reports.latest_report_reason_code,
    latest_reports.latest_report_description,
    latest_reports.latest_report_created_at,
    coalesce(
      audit_action_summaries.audit_actions,
      '[]'::jsonb
    ) as audit_actions
  from moderation_cases moderation_case
  join report_summaries
    on report_summaries.moderation_case_id = moderation_case.id
  join listings listing on listing.id = moderation_case.listing_id
  join users owner on owner.id = listing.owner_user_id
  left join users assignee on assignee.id = moderation_case.assigned_to_user_id
  left join geo_municipalities municipality
    on municipality.id = listing.municipality_id
  left join geo_provinces province on province.id = listing.province_id
  left join geo_regions region on region.id = listing.region_id
  left join ready_images on ready_images.listing_id = listing.id
  left join cover_images on cover_images.listing_id = listing.id
  left join preview_images on preview_images.listing_id = listing.id
  left join latest_reports
    on latest_reports.moderation_case_id = moderation_case.id
  left join audit_action_summaries
    on audit_action_summaries.case_id = moderation_case.id
  where moderation_case.status = 'open'
    and listing.deleted_at is null
    and owner.deleted_at is null
  order by report_summaries.first_reported_at asc, moderation_case.created_at asc
  limit $1::int
  offset $2::int
`

const recentModerationActionsSql = `
  select
    count(*) over()::int as total_count,
    moderation_action.id::text as action_id,
    moderation_action.action::text as action_type,
    moderation_action.reason_code as action_reason_code,
    moderation_action.reason_text as action_reason_text,
    moderation_action.from_status::text as action_from_status,
    moderation_action.to_status::text as action_to_status,
    moderation_action.created_at as action_created_at,
    moderation_case.id::text as case_id,
    moderation_case.status::text as case_status,
    moderation_case.assigned_to_user_id::text as assigned_to_user_id,
    assignee.email as assigned_to_user_email,
    assignee.display_name as assigned_to_user_display_name,
    listing.id::text as listing_id,
    listing.title as listing_title,
    listing.slug as listing_slug,
    listing.moderation_status::text as listing_moderation_status,
    listing.lifecycle_status::text as listing_lifecycle_status,
    owner.id::text as owner_user_id,
    owner.email as owner_email,
    owner.display_name as owner_display_name,
    actor.id::text as actor_user_id,
    actor.email as actor_email,
    actor.display_name as actor_display_name
  from moderation_actions moderation_action
  join moderation_cases moderation_case
    on moderation_case.id = moderation_action.case_id
  join listings listing on listing.id = moderation_case.listing_id
  join users owner on owner.id = listing.owner_user_id
  left join users assignee on assignee.id = moderation_case.assigned_to_user_id
  left join users actor on actor.id = moderation_action.actor_user_id
  where listing.deleted_at is null
    and owner.deleted_at is null
  order by moderation_action.created_at desc, moderation_action.id desc
  limit $1::int
  offset $2::int
`

const decideListingCaseSql = `
  with target_case as (
    select
      moderation_case.id,
      moderation_case.listing_id,
      moderation_case.assigned_to_user_id::text as previous_assigned_to_user_id,
      listing.title,
      listing.slug,
      listing.moderation_status::text as from_status,
      owner.id::text as owner_user_id,
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
      and (
        $10::boolean
        or
        moderation_case.assigned_to_user_id is null
        or moderation_case.assigned_to_user_id = $2::uuid
      )
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
        $9::text,
        'previousAssignedToUserId',
        target_case.previous_assigned_to_user_id,
        'assignmentOverride',
        $10::boolean
          and target_case.previous_assigned_to_user_id is not null
          and target_case.previous_assigned_to_user_id <> $2::text
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
            'listingReportDecisionEmailEnabled',
            active_reports.reporter_listing_report_decision_email_enabled,
            'reasonCode',
            active_reports.reason_code
          )
        ) filter (
          where active_reports.reporter_email is not null
            and active_reports.reporter_user_id is not null
            and updated_reports.id is not null
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
    target_case.owner_user_id,
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

const moderationDecisionStateSql = `
  select
    moderation_case.id::text as case_id,
    moderation_case.status::text as case_status,
    moderation_case.assigned_to_user_id::text as assigned_to_user_id,
    listing.id::text as listing_id,
    listing.moderation_status::text as listing_moderation_status,
    listing.lifecycle_status::text as listing_lifecycle_status,
    listing.deleted_at is not null as listing_deleted,
    owner.deleted_at is not null as owner_deleted
  from moderation_cases moderation_case
  join listings listing on listing.id = moderation_case.listing_id
  join users owner on owner.id = listing.owner_user_id
  where moderation_case.id = $1::uuid
  limit 1
`

const claimListingCaseSql = `
  with target_case as (
    select
      moderation_case.id,
      moderation_case.assigned_to_user_id::text as previous_assigned_to_user_id
    from moderation_cases moderation_case
    join listings listing on listing.id = moderation_case.listing_id
    join users owner on owner.id = listing.owner_user_id
    where moderation_case.id = $1::uuid
      and moderation_case.status = 'open'
      and listing.deleted_at is null
      and owner.deleted_at is null
    for update of moderation_case
  ),
  updated_case as (
    update moderation_cases
    set
      assigned_to_user_id = $2::uuid,
      updated_at = now()
    from target_case
    where moderation_cases.id = target_case.id
      and (
        target_case.previous_assigned_to_user_id is null
        or target_case.previous_assigned_to_user_id = $2::text
      )
    returning
      moderation_cases.id::text as case_id,
      moderation_cases.assigned_to_user_id::text as assigned_to_user_id,
      moderation_cases.updated_at
  ),
  inserted_action as (
    insert into moderation_actions (
      case_id,
      actor_user_id,
      action,
      metadata
    )
    select
      updated_case.case_id::uuid,
      $2::uuid,
      'assigned'::moderation_action_type,
      jsonb_build_object(
        'previousAssignedToUserId',
        target_case.previous_assigned_to_user_id
      )
    from updated_case
    join target_case on target_case.id = updated_case.case_id::uuid
    where target_case.previous_assigned_to_user_id is null
    returning id::text
  )
  select
    target_case.id::text as case_id,
    target_case.previous_assigned_to_user_id,
    updated_case.assigned_to_user_id,
    updated_case.updated_at,
    inserted_action.id as action_id
  from target_case
  left join updated_case on true
  left join inserted_action on true
`

const commentListingCaseSql = `
  with target_case as (
    select
      moderation_case.id,
      moderation_case.status::text as case_status
    from moderation_cases moderation_case
    join listings listing on listing.id = moderation_case.listing_id
    join users owner on owner.id = listing.owner_user_id
    where moderation_case.id = $1::uuid
      and listing.deleted_at is null
      and owner.deleted_at is null
    for update of moderation_case
  ),
  updated_case as (
    update moderation_cases
    set updated_at = now()
    from target_case
    where moderation_cases.id = target_case.id
    returning
      moderation_cases.id::text as case_id,
      moderation_cases.status::text as case_status,
      moderation_cases.updated_at
  ),
  inserted_action as (
    insert into moderation_actions (
      case_id,
      actor_user_id,
      action,
      reason_text,
      metadata
    )
    select
      target_case.id,
      $2::uuid,
      'commented'::moderation_action_type,
      $3::text,
      jsonb_build_object('visibility', 'internal')
    from target_case
    returning id::text, created_at
  )
  select
    updated_case.case_id,
    updated_case.case_status,
    updated_case.updated_at,
    inserted_action.id as action_id,
    inserted_action.created_at as action_created_at,
    $3::text as comment_text
  from updated_case
  join inserted_action on true
`

@Injectable()
export class ModerationService {
  constructor(
    @Inject(DatabaseService)
    private readonly databaseService: DatabaseService,
    @Inject(ListingSearchDocumentsService)
    private readonly listingSearchDocumentsService: ListingSearchDocumentsService,
    @Inject(MailService)
    private readonly mailService: MailService,
    @Inject(NotificationsService)
    private readonly notificationsService: NotificationsService
  ) {}

  async pendingReviewQueue(
    moderatorUserId: string,
    query: PaginationQuery
  ): Promise<ModerationQueueResponse> {
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

  async recentListingActions(
    moderatorUserId: string,
    query: PaginationQuery
  ): Promise<ModerationRecentActionsResponse> {
    const rows = await this.databaseService.queryRows<RecentModerationActionRow>(
      recentModerationActionsSql,
      [query.pageSize, (query.page - 1) * query.pageSize]
    )
    const total = rows[0] ? Number(rows[0].total_count) : 0

    return {
      items: rows.map(mapRecentActionRow),
      meta: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.ceil(total / query.pageSize),
      },
    }
  }

  async claimListingCase(
    moderatorUserId: string,
    caseId: string
  ): Promise<ModerationClaimResponse> {
    const [row] = await this.databaseService.queryRows<ModerationClaimRow>(
      claimListingCaseSql,
      [caseId, moderatorUserId]
    )

    if (!row) {
      throw new NotFoundException("Moderation case not found or not open.")
    }

    if (!row.assigned_to_user_id || !row.updated_at) {
      throw new ConflictException(
        "Moderation case is already assigned to another moderator."
      )
    }

    return {
      claimed: true,
      action: row.action_id ? { id: row.action_id } : null,
      case: {
        id: row.case_id,
        assignedToUserId: row.assigned_to_user_id,
        updatedAt: toIsoString(row.updated_at),
      },
    }
  }

  async commentListingCase(
    moderatorUserId: string,
    caseId: string,
    input: ModerationCommentInput
  ): Promise<ModerationCommentResponse> {
    const [row] = await this.databaseService.queryRows<ModerationCommentRow>(
      commentListingCaseSql,
      [caseId, moderatorUserId, input.note]
    )

    if (!row) {
      throw new NotFoundException("Moderation case not found.")
    }

    return {
      commented: true,
      action: {
        id: row.action_id,
        createdAt: toIsoString(row.action_created_at),
      },
      case: {
        id: row.case_id,
        status: row.case_status,
        updatedAt: toIsoString(row.updated_at),
      },
      comment: {
        text: row.comment_text,
      },
    }
  }

  async decideListingCase(
    moderatorUserId: string,
    caseId: string,
    decision: ModerationDecisionAction,
    input: ModerationDecisionInput,
    options: ModerationDecisionOptions = {}
  ): Promise<ModerationDecisionResponse> {
    assertDecisionReason(input)

    const config = moderationDecisionConfigs[decision]
    const canOverrideAssignment = options.canOverrideAssignment ?? false
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
        canOverrideAssignment,
      ]
    )

    if (!row) {
      return await this.throwDecisionNotAvailable(
        moderatorUserId,
        caseId,
        canOverrideAssignment
      )
    }

    await this.listingSearchDocumentsService.refreshListing(row.listing_id)

    const response = mapDecisionRow(row, config.action, input)

    await this.sendDecisionNotifications(row, config.action, input)

    return response
  }

  private async throwDecisionNotAvailable(
    moderatorUserId: string,
    caseId: string,
    canOverrideAssignment: boolean
  ): Promise<never> {
    const rows =
      (await this.databaseService.queryRows<ModerationDecisionStateRow>(
        moderationDecisionStateSql,
        [caseId]
      )) ?? []
    const state = rows[0]

    if (
      state?.case_status === "open" &&
      state.assigned_to_user_id &&
      state.assigned_to_user_id !== moderatorUserId &&
      !canOverrideAssignment
    ) {
      throw new ConflictException({
        message: "Moderation case is assigned to another moderator.",
        reason: "moderation_case_assigned_elsewhere",
      })
    }

    if (state && state.case_status !== "open") {
      throw new ConflictException({
        message: "Moderation case has already been decided.",
        reason: "moderation_case_already_decided",
      })
    }

    throw new NotFoundException("Moderation case not found or not decidable.")
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
    const reportNotifications = parseReportNotifications(
      row.report_notifications
    )

    await this.notificationsService.createListingModerationDecisionNotification(
      row.owner_user_id,
      {
        ...message,
        caseId: row.case_id,
        listingId: row.listing_id,
      }
    )

    await Promise.all(
      reportNotifications.map((report) =>
        this.notificationsService.createListingReportDecisionNotification(
          report.reporterUserId,
          {
            ...message,
            caseId: row.case_id,
            listingId: row.listing_id,
            reportId: report.reportId,
            reportResolutionStatus: row.report_resolution_status,
          }
        )
      )
    )

    if (row.owner_listing_moderation_decision_email_enabled) {
      await this.mailService.sendListingModerationDecision({
        ...message,
        displayName: row.owner_display_name,
        to: row.owner_email,
      })
    }

    await Promise.all(
      reportNotifications
        .filter((report) => report.listingReportDecisionEmailEnabled)
        .map((report) =>
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
      assignedTo: mapAssignedUser(row),
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
      preview: parseQueueImages(row.preview_images),
    },
    audit: {
      actions: parseAuditActions(row.audit_actions),
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
      assignedTo: mapAssignedUser(row),
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
      preview: parseQueueImages(row.preview_images),
    },
    audit: {
      actions: parseAuditActions(row.audit_actions),
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

function mapRecentActionRow(
  row: RecentModerationActionRow
): ModerationRecentActionItem {
  return {
    action: {
      id: row.action_id,
      type: row.action_type,
      reasonCode: row.action_reason_code,
      reasonText: row.action_reason_text,
      fromStatus: row.action_from_status,
      toStatus: row.action_to_status,
      createdAt: toIsoString(row.action_created_at),
    },
    case: {
      id: row.case_id,
      status: row.case_status,
      assignedToUserId: row.assigned_to_user_id,
      assignedTo: mapAssignedUser(row),
    },
    listing: {
      id: row.listing_id,
      title: row.listing_title,
      slug: row.listing_slug,
      moderationStatus: row.listing_moderation_status,
      lifecycleStatus: row.listing_lifecycle_status,
    },
    owner: {
      id: row.owner_user_id,
      email: row.owner_email,
      displayName: row.owner_display_name,
    },
    actor:
      row.actor_user_id && row.actor_email && row.actor_display_name
        ? {
            id: row.actor_user_id,
            email: row.actor_email,
            displayName: row.actor_display_name,
          }
        : null,
  }
}

function mapAssignedUser(
  row:
    | PendingReviewQueueRow
    | ReportedListingQueueRow
    | RecentModerationActionRow
) {
  if (
    !row.assigned_to_user_id ||
    !row.assigned_to_user_email ||
    !row.assigned_to_user_display_name
  ) {
    return null
  }

  return {
    id: row.assigned_to_user_id,
    email: row.assigned_to_user_email,
    displayName: row.assigned_to_user_display_name,
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

function parseAuditActions(value: unknown): ModerationAuditAction[] {
  const parsed = typeof value === "string" ? parseJson(value) : value

  if (!Array.isArray(parsed)) {
    return []
  }

  return parsed.flatMap((item) => {
    if (!isRecord(item)) {
      return []
    }

    const { action, createdAt, id } = item
    const fromStatus = readNullableString(item, "fromStatus")
    const toStatus = readNullableString(item, "toStatus")

    if (
      typeof id !== "string" ||
      typeof action !== "string" ||
      !isModerationAuditActionType(action) ||
      typeof createdAt !== "string" ||
      !isNullableListingModerationStatus(fromStatus) ||
      !isNullableListingModerationStatus(toStatus)
    ) {
      return []
    }

    return [
      {
        id,
        action,
        reasonCode: readNullableString(item, "reasonCode"),
        reasonText: readNullableString(item, "reasonText"),
        fromStatus,
        toStatus,
        createdAt: toIsoString(createdAt),
        actor: mapAuditActor(item.actor),
      },
    ]
  })
}

function parseQueueImages(
  value: unknown
): ModerationQueueItem["images"]["preview"] {
  const parsed = typeof value === "string" ? parseJson(value) : value

  if (!Array.isArray(parsed)) {
    return []
  }

  return parsed.flatMap((item) => {
    if (!isRecord(item)) {
      return []
    }

    if (
      typeof item.id !== "string" ||
      typeof item.isCover !== "boolean" ||
      typeof item.sortOrder !== "number"
    ) {
      return []
    }

    return [
      {
        id: item.id,
        objectKeyThumb: readNullableString(item, "objectKeyThumb"),
        objectKeyLarge: readNullableString(item, "objectKeyLarge"),
        isCover: item.isCover,
        sortOrder: item.sortOrder,
      },
    ]
  })
}

function mapAuditActor(value: unknown): ModerationAuditAction["actor"] {
  if (!isRecord(value)) {
    return null
  }

  if (
    typeof value.id !== "string" ||
    typeof value.email !== "string" ||
    typeof value.displayName !== "string"
  ) {
    return null
  }

  return {
    id: value.id,
    email: value.email,
    displayName: value.displayName,
  }
}

function readNullableString(
  value: Record<string, unknown>,
  key: string
): string | null {
  const item = value[key]

  return typeof item === "string" ? item : null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function isModerationAuditActionType(
  value: string
): value is ModerationAuditAction["action"] {
  return moderationAuditActionTypes.has(value)
}

function isNullableListingModerationStatus(
  value: string | null
): value is ListingModerationStatus | null {
  return value === null || listingModerationStatuses.has(value)
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
    "listingReportDecisionEmailEnabled" in value &&
    typeof value.listingReportDecisionEmailEnabled === "boolean" &&
    "reasonCode" in value &&
    typeof value.reasonCode === "string"
  )
}
