import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common"
import type { ListingReportCreateInput } from "@workspace/validation"

import { DatabaseService } from "../database/database.service.js"
import type { ListingReport, ListingReportResponse } from "./reports.types.js"

type ReportableListingRow = {
  id: string
  owner_user_id: string
}

type ListingReportRow = {
  id: string
  moderation_case_id: string
  listing_id: string
  reason_code: string
  description: string | null
  status: "linked"
  created_at: Date | string
  updated_at: Date | string
  moderation_case_status: "open"
}

type CreatedListingReportRow = ListingReportRow & {
  action_id: string
}

const getReportableListingSql = `
  select
    id::text,
    owner_user_id::text
  from listings
  where id = $1::uuid
    and moderation_status = 'approved'
    and lifecycle_status = 'published'
    and deleted_at is null
    and (expires_at is null or expires_at > now())
  limit 1
`

const findActiveListingReportSql = `
  select
    report.id::text,
    report.moderation_case_id::text,
    report.target_id::text as listing_id,
    report.reason_code,
    report.description,
    report.status::text as status,
    report.created_at,
    report.updated_at,
    moderation_case.status::text as moderation_case_status
  from reports report
  join moderation_cases moderation_case
    on moderation_case.id = report.moderation_case_id
  where report.reporter_user_id = $1::uuid
    and report.target_type = 'listing'
    and report.target_id = $2::uuid
    and report.status = 'linked'
    and moderation_case.status = 'open'
  order by report.created_at desc
  limit 1
`

const createListingReportSql = `
  with target_listing as (
    select
      id,
      moderation_status::text as moderation_status
    from listings
    where id = $2::uuid
      and moderation_status = 'approved'
      and lifecycle_status = 'published'
      and deleted_at is null
      and (expires_at is null or expires_at > now())
  ),
  existing_case as (
    select moderation_case.id
    from moderation_cases moderation_case
    join target_listing on target_listing.id = moderation_case.listing_id
    where moderation_case.status = 'open'
    order by moderation_case.created_at asc
    limit 1
  ),
  created_case as (
    insert into moderation_cases (
      listing_id,
      opened_by_user_id,
      status,
      reason_code
    )
    select
      target_listing.id,
      $1::uuid,
      'open',
      'user_report'
    from target_listing
    where not exists (select 1 from existing_case)
    returning id
  ),
  target_case as (
    select id from existing_case
    union all
    select id from created_case
    limit 1
  ),
  inserted_report as (
    insert into reports (
      reporter_user_id,
      moderation_case_id,
      target_type,
      target_id,
      reason_code,
      description,
      status
    )
    select
      $1::uuid,
      target_case.id,
      'listing',
      $2::uuid,
      $3::text,
      $4::text,
      'linked'
    from target_case
    returning
      id::text,
      moderation_case_id::text,
      target_id::text as listing_id,
      reason_code,
      description,
      status::text as status,
      created_at,
      updated_at
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
      $1::uuid,
      'reported',
      $3::text,
      $4::text,
      target_listing.moderation_status::listing_moderation_status,
      target_listing.moderation_status::listing_moderation_status,
      jsonb_build_object(
        'reportId',
        inserted_report.id,
        'targetType',
        'listing'
      )
    from target_case
    join target_listing on true
    join inserted_report on true
    returning id::text
  )
  select
    inserted_report.id,
    inserted_report.moderation_case_id,
    inserted_report.listing_id,
    inserted_report.reason_code,
    inserted_report.description,
    inserted_report.status,
    inserted_report.created_at,
    inserted_report.updated_at,
    moderation_case.status::text as moderation_case_status,
    inserted_action.id as action_id
  from inserted_report
  join moderation_cases moderation_case
    on moderation_case.id = inserted_report.moderation_case_id::uuid
  join inserted_action on true
`

@Injectable()
export class ReportsService {
  constructor(
    @Inject(DatabaseService)
    private readonly databaseService: DatabaseService
  ) {}

  async reportListing(
    reporterUserId: string,
    listingId: string,
    input: ListingReportCreateInput
  ): Promise<ListingReportResponse> {
    const [listing] = await this.databaseService.queryRows<ReportableListingRow>(
      getReportableListingSql,
      [listingId]
    )

    if (!listing) {
      throw new NotFoundException("Reportable listing not found.")
    }

    if (listing.owner_user_id === reporterUserId) {
      throw new BadRequestException("Users cannot report their own listing.")
    }

    const [existingReport] =
      await this.databaseService.queryRows<ListingReportRow>(
        findActiveListingReportSql,
        [reporterUserId, listingId]
      )

    if (existingReport) {
      return {
        created: false,
        report: mapReportRow(existingReport),
        moderationCase: {
          id: existingReport.moderation_case_id,
          status: existingReport.moderation_case_status,
        },
        action: null,
      }
    }

    const [createdReport] =
      await this.databaseService.queryRows<CreatedListingReportRow>(
        createListingReportSql,
        [
          reporterUserId,
          listingId,
          input.reasonCode,
          input.description ?? null,
        ]
      )

    if (!createdReport) {
      throw new NotFoundException("Reportable listing not found.")
    }

    return {
      created: true,
      report: mapReportRow(createdReport),
      moderationCase: {
        id: createdReport.moderation_case_id,
        status: createdReport.moderation_case_status,
      },
      action: {
        id: createdReport.action_id,
      },
    }
  }
}

function mapReportRow(row: ListingReportRow): ListingReport {
  return {
    id: row.id,
    listingId: row.listing_id,
    moderationCaseId: row.moderation_case_id,
    reasonCode: row.reason_code,
    description: row.description,
    status: row.status,
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at),
  }
}

function toIsoString(value: Date | string) {
  return new Date(value).toISOString()
}
