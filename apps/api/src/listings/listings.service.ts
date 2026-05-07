import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common"
import { listingImageMaxSizeBytes } from "@workspace/validation"
import type {
  ListingDraftCreateInput,
  ListingDraftListQuery,
  ListingDraftUpdateInput,
  ListingImageUploadRequestInput,
  ListingPublicListQuery,
  ListingSex,
} from "@workspace/validation"

import { DatabaseService } from "../database/database.service.js"
import { ObjectStorageService } from "../storage/object-storage.service.js"
import type {
  ListingDraft,
  ListingDraftDeleteResponse,
  ListingDraftListResponse,
  ListingDraftLocation,
  ListingDraftSubmissionResponse,
  ListingImage,
  ListingImageConfirmationResponse,
  ListingImageUploadResponse,
  PublicListingDetail,
  PublicListingImage,
  PublicListingListResponse,
  PublicListingSummary,
  ListingReviewSubmission,
} from "./listings.types.js"

const maxListingImages = 10

type ListingOwnerRow<
  ModerationStatus extends "draft" | "pending_review",
  LifecycleStatus extends "draft",
> = {
  id: string
  title: string
  slug: string
  description: string
  breed_id: string | null
  breed_name: string | null
  breed_slug: string | null
  sex: ListingSex
  age_months_min: number | null
  age_months_max: number | null
  municipality_id: string | null
  municipality_name: string | null
  municipality_istat_code: string | null
  province_id: string | null
  province_name: string | null
  province_istat_code: string | null
  region_id: string | null
  region_name: string | null
  region_istat_code: string | null
  location_lat: number | string | null
  location_lng: number | string | null
  contribution_cents: number | null
  is_free: boolean
  is_vaccinated: boolean | null
  is_sterilized: boolean | null
  is_dewormed: boolean | null
  has_microchip: boolean | null
  moderation_status: ModerationStatus
  lifecycle_status: LifecycleStatus
  created_at: Date | string
  updated_at: Date | string
}

type ListingDraftRow = ListingOwnerRow<"draft", "draft">

type ListingReviewSubmissionRow = ListingOwnerRow<"pending_review", "draft">

type ListingDraftListRow = ListingDraftRow & {
  total_count: number | string
}

type PublicListingRow = Omit<
  ListingOwnerRow<"pending_review", "draft">,
  "moderation_status" | "lifecycle_status"
> & {
  total_count?: number | string
  owner_user_id: string
  owner_display_name: string
  owner_profile_type: string
  published_at: Date | string | null
  expires_at: Date | string | null
  like_count: number | string
  ready_image_count: number | string
  cover_image_id: string | null
  cover_object_key_large: string | null
  cover_object_key_thumb: string | null
  cover_width: number | null
  cover_height: number | null
  cover_blur_hash: string | null
  cover_sort_order: number | null
  cover_is_cover: boolean | null
}

type MunicipalityLocationRow = {
  municipality_id: string
  province_id: string
  region_id: string
  center_lat: number | string | null
  center_lng: number | string | null
}

type MunicipalityLocation = {
  municipalityId: string
  provinceId: string
  regionId: string
  centerLat: number | null
  centerLng: number | null
}

type SubmissionIssue = {
  path: string[]
  message: string
}

type ListingImageRow = {
  id: string
  listing_id: string
  object_key_original: string
  object_key_large: string | null
  object_key_thumb: string | null
  mime_type: ListingImage["mimeType"]
  width: number | null
  height: number | null
  size_bytes: number
  checksum: string | null
  blur_hash: string | null
  sort_order: number
  is_cover: boolean
  status: ListingImage["status"]
  rejection_reason: string | null
  created_at: Date | string
  updated_at: Date | string
}

type ListingImageCountRow = {
  image_count: number | string
}

type ListingImageReadinessRow = {
  ready_count: number | string
  pending_count: number | string
  rejected_count: number | string
}

type PublicListingImageRow = {
  id: string
  object_key_large: string | null
  object_key_thumb: string | null
  width: number | null
  height: number | null
  blur_hash: string | null
  sort_order: number
  is_cover: boolean
}

const listingDraftSelectFields = `
  listing.id::text,
  listing.title,
  listing.slug,
  listing.description,
  listing.breed_id::text as breed_id,
  breed.name as breed_name,
  breed.slug as breed_slug,
  listing.sex::text as sex,
  listing.age_months_min,
  listing.age_months_max,
  listing.municipality_id::text as municipality_id,
  municipality.name as municipality_name,
  municipality.istat_code as municipality_istat_code,
  listing.province_id::text as province_id,
  province.name as province_name,
  province.istat_code as province_istat_code,
  listing.region_id::text as region_id,
  region.name as region_name,
  region.istat_code as region_istat_code,
  case
    when listing.location_point is null then null
    else ST_Y(listing.location_point)::float8
  end as location_lat,
  case
    when listing.location_point is null then null
    else ST_X(listing.location_point)::float8
  end as location_lng,
  listing.contribution_cents,
  listing.is_free,
  listing.is_vaccinated,
  listing.is_sterilized,
  listing.is_dewormed,
  listing.has_microchip,
  listing.moderation_status::text as moderation_status,
  listing.lifecycle_status::text as lifecycle_status,
  listing.created_at,
  listing.updated_at
`

const publicListingSelectFields = `
  listing.id::text,
  listing.title,
  listing.slug,
  listing.description,
  listing.breed_id::text as breed_id,
  breed.name as breed_name,
  breed.slug as breed_slug,
  listing.sex::text as sex,
  listing.age_months_min,
  listing.age_months_max,
  listing.municipality_id::text as municipality_id,
  municipality.name as municipality_name,
  municipality.istat_code as municipality_istat_code,
  listing.province_id::text as province_id,
  province.name as province_name,
  province.istat_code as province_istat_code,
  listing.region_id::text as region_id,
  region.name as region_name,
  region.istat_code as region_istat_code,
  case
    when listing.location_point is null then null
    else ST_Y(listing.location_point)::float8
  end as location_lat,
  case
    when listing.location_point is null then null
    else ST_X(listing.location_point)::float8
  end as location_lng,
  listing.contribution_cents,
  listing.is_free,
  listing.is_vaccinated,
  listing.is_sterilized,
  listing.is_dewormed,
  listing.has_microchip,
  listing.published_at,
  listing.expires_at,
  listing.created_at,
  listing.updated_at,
  owner.id::text as owner_user_id,
  owner.display_name as owner_display_name,
  owner.profile_type::text as owner_profile_type,
  coalesce(like_counts.like_count, 0)::int as like_count,
  coalesce(ready_images.ready_image_count, 0)::int as ready_image_count,
  cover_images.cover_image_id,
  cover_images.object_key_large as cover_object_key_large,
  cover_images.object_key_thumb as cover_object_key_thumb,
  cover_images.width as cover_width,
  cover_images.height as cover_height,
  cover_images.blur_hash as cover_blur_hash,
  cover_images.sort_order as cover_sort_order,
  cover_images.is_cover as cover_is_cover
`

const listingDraftJoins = `
  left join cat_breeds breed on breed.id = listing.breed_id
  left join geo_municipalities municipality
    on municipality.id = listing.municipality_id
  left join geo_provinces province on province.id = listing.province_id
  left join geo_regions region on region.id = listing.region_id
`

const publicListingJoins = `
  join users owner on owner.id = listing.owner_user_id
  left join cat_breeds breed on breed.id = listing.breed_id
  left join geo_municipalities municipality
    on municipality.id = listing.municipality_id
  left join geo_provinces province on province.id = listing.province_id
  left join geo_regions region on region.id = listing.region_id
  left join (
    select
      listing_id,
      count(*)::int as ready_image_count
    from listing_images
    where status = 'ready'
      and deleted_at is null
    group by listing_id
  ) ready_images on ready_images.listing_id = listing.id
  left join (
    select distinct on (listing_id)
      listing_id,
      id::text as cover_image_id,
      object_key_large,
      object_key_thumb,
      width,
      height,
      blur_hash,
      sort_order,
      is_cover
    from listing_images
    where status = 'ready'
      and deleted_at is null
      and is_cover = true
    order by listing_id, sort_order, created_at
  ) cover_images on cover_images.listing_id = listing.id
  left join (
    select
      listing_id,
      count(*)::int as like_count
    from listing_likes
    group by listing_id
  ) like_counts on like_counts.listing_id = listing.id
`

const activeDraftWhereSql = `
  listing.owner_user_id = $1::uuid
  and listing.moderation_status = 'draft'
  and listing.lifecycle_status = 'draft'
  and listing.deleted_at is null
`

const publicListingWhereSql = `
  listing.moderation_status = 'approved'
  and listing.lifecycle_status = 'published'
  and listing.deleted_at is null
  and owner.deleted_at is null
  and (listing.expires_at is null or listing.expires_at > now())
`

const activeMunicipalityLocationSql = `
  select
    municipality.id::text as municipality_id,
    municipality.province_id::text as province_id,
    municipality.region_id::text as region_id,
    case
      when municipality.centroid is null then null
      else ST_Y(municipality.centroid)::float8
    end as center_lat,
    case
      when municipality.centroid is null then null
      else ST_X(municipality.centroid)::float8
    end as center_lng
  from geo_municipalities municipality
  join geo_provinces province on province.id = municipality.province_id
  join geo_regions region on region.id = municipality.region_id
  where municipality.id = $1::uuid
    and municipality.valid_to is null
    and municipality.is_active = true
    and province.valid_to is null
    and region.valid_to is null
  limit 1
`

const listUserDraftsSql = `
  select
    ${listingDraftSelectFields},
    count(*) over()::int as total_count
  from listings listing
  ${listingDraftJoins}
  where ${activeDraftWhereSql}
  order by listing.updated_at desc, listing.created_at desc, listing.id
  limit $2::int
  offset $3::int
`

const getUserDraftSql = `
  select ${listingDraftSelectFields}
  from listings listing
  ${listingDraftJoins}
  where ${activeDraftWhereSql}
    and listing.id = $2::uuid
  limit 1
`

const listPublicListingsSql = `
  select
    ${publicListingSelectFields},
    count(*) over()::int as total_count
  from listings listing
  ${publicListingJoins}
  where ${publicListingWhereSql}
    and ($3::uuid is null or listing.breed_id = $3::uuid)
    and ($4::uuid is null or listing.municipality_id = $4::uuid)
    and ($5::uuid is null or listing.province_id = $5::uuid)
    and ($6::uuid is null or listing.region_id = $6::uuid)
    and ($7::listing_sex is null or listing.sex = $7::listing_sex)
    and (
      $8::int is null
      or coalesce(listing.age_months_max, listing.age_months_min) >= $8::int
    )
    and (
      $9::int is null
      or coalesce(listing.age_months_min, listing.age_months_max) <= $9::int
    )
    and ($10::boolean is null or listing.is_free = $10::boolean)
    and ($11::boolean is null or listing.is_vaccinated = $11::boolean)
    and ($12::boolean is null or listing.is_sterilized = $12::boolean)
    and ($13::boolean is null or listing.is_dewormed = $13::boolean)
    and ($14::boolean is null or listing.has_microchip = $14::boolean)
    and (
      $15::boolean is null
      or (coalesce(ready_images.ready_image_count, 0) > 0) = $15::boolean
    )
  order by listing.published_at desc nulls last, listing.updated_at desc, listing.id
  limit $1::int
  offset $2::int
`

const getPublicListingSql = `
  select ${publicListingSelectFields}
  from listings listing
  ${publicListingJoins}
  where ${publicListingWhereSql}
    and listing.id = $1::uuid
  limit 1
`

const listPublicListingImagesSql = `
  select
    id::text,
    object_key_large,
    object_key_thumb,
    width,
    height,
    blur_hash,
    sort_order,
    is_cover
  from listing_images
  where listing_id = $1::uuid
    and status = 'ready'
    and deleted_at is null
  order by sort_order asc, created_at asc, id asc
`

const createUserDraftSql = `
  with inserted as (
    insert into listings (
      owner_user_id,
      title,
      slug,
      description,
      breed_id,
      sex,
      age_months_min,
      age_months_max,
      municipality_id,
      province_id,
      region_id,
      location_point,
      contribution_cents,
      is_free,
      is_vaccinated,
      is_sterilized,
      is_dewormed,
      has_microchip
    )
    values (
      $1::uuid,
      $2::text,
      $3::text,
      $4::text,
      $5::uuid,
      $6::listing_sex,
      $7::int,
      $8::int,
      $9::uuid,
      $10::uuid,
      $11::uuid,
      case
        when $12::float8 is null or $13::float8 is null then null
        else ST_SetSRID(ST_MakePoint($13::float8, $12::float8), 4326)
      end,
      $14::int,
      $15::boolean,
      $16::boolean,
      $17::boolean,
      $18::boolean,
      $19::boolean
    )
    returning *
  )
  select ${listingDraftSelectFields}
  from inserted listing
  ${listingDraftJoins}
`

const updateUserDraftSql = `
  with updated as (
    update listings
    set
      title = case when $3::boolean then $4::text else title end,
      slug = case when $3::boolean then $5::text else slug end,
      description = case when $6::boolean then $7::text else description end,
      breed_id = case when $8::boolean then $9::uuid else breed_id end,
      sex = case when $10::boolean then $11::listing_sex else sex end,
      age_months_min = case
        when $12::boolean then $13::int
        else age_months_min
      end,
      age_months_max = case
        when $14::boolean then $15::int
        else age_months_max
      end,
      municipality_id = case
        when $16::boolean then $17::uuid
        else municipality_id
      end,
      province_id = case
        when $16::boolean then $18::uuid
        else province_id
      end,
      region_id = case
        when $16::boolean then $19::uuid
        else region_id
      end,
      location_point = case
        when $16::boolean then
          case
            when $20::float8 is null or $21::float8 is null then null
            else ST_SetSRID(ST_MakePoint($21::float8, $20::float8), 4326)
          end
        else location_point
      end,
      contribution_cents = case
        when $22::boolean then $23::int
        else contribution_cents
      end,
      is_free = case when $24::boolean then $25::boolean else is_free end,
      is_vaccinated = case
        when $26::boolean then $27::boolean
        else is_vaccinated
      end,
      is_sterilized = case
        when $28::boolean then $29::boolean
        else is_sterilized
      end,
      is_dewormed = case
        when $30::boolean then $31::boolean
        else is_dewormed
      end,
      has_microchip = case
        when $32::boolean then $33::boolean
        else has_microchip
      end,
      updated_at = now()
    where id = $1::uuid
      and owner_user_id = $2::uuid
      and moderation_status = 'draft'
      and lifecycle_status = 'draft'
      and deleted_at is null
    returning *
  )
  select ${listingDraftSelectFields}
  from updated listing
  ${listingDraftJoins}
`

const deleteUserDraftSql = `
  update listings
  set
    lifecycle_status = 'deleted',
    deleted_at = now(),
    updated_at = now()
  where id = $1::uuid
    and owner_user_id = $2::uuid
    and moderation_status = 'draft'
    and lifecycle_status = 'draft'
    and deleted_at is null
  returning id::text
`

const duplicateSubmittedListingSql = `
  select id::text
  from listings
  where owner_user_id = $1::uuid
    and id <> $2::uuid
    and slug = $3::text
    and municipality_id is not distinct from $4::uuid
    and deleted_at is null
    and moderation_status in ('draft', 'pending_review', 'approved')
    and lifecycle_status in ('draft', 'published')
  limit 1
`

const submitUserDraftSql = `
  with updated as (
    update listings
    set
      moderation_status = 'pending_review',
      updated_at = now()
    where id = $1::uuid
      and owner_user_id = $2::uuid
      and moderation_status = 'draft'
      and lifecycle_status = 'draft'
      and deleted_at is null
    returning *
  ),
  opened_case as (
    insert into moderation_cases (
      listing_id,
      opened_by_user_id,
      status,
      reason_code
    )
    select updated.id, updated.owner_user_id, 'open', 'listing_submission'
    from updated
    returning id, listing_id
  ),
  opened_action as (
    insert into moderation_actions (
      case_id,
      actor_user_id,
      action,
      reason_code,
      from_status,
      to_status
    )
    select
      opened_case.id,
      updated.owner_user_id,
      'opened',
      'listing_submission',
      'draft',
      'pending_review'
    from opened_case
    join updated on updated.id = opened_case.listing_id
    returning id
  )
  select ${listingDraftSelectFields}
  from updated listing
  ${listingDraftJoins}
`

const countDraftImagesSql = `
  select count(listing_image.id)::int as image_count
  from listings listing
  left join listing_images listing_image
    on listing_image.listing_id = listing.id
    and listing_image.deleted_at is null
  where ${activeDraftWhereSql}
    and listing.id = $2::uuid
`

const countDraftImageReadinessSql = `
  select
    count(*) filter (where listing_image.status = 'ready')::int as ready_count,
    count(*) filter (
      where listing_image.status in ('uploaded', 'processing')
    )::int as pending_count,
    count(*) filter (where listing_image.status = 'rejected')::int as rejected_count
  from listing_images listing_image
  where listing_image.listing_id = $1::uuid
    and listing_image.deleted_at is null
`

const createDraftImageSql = `
  with image_position as (
    select
      coalesce(max(sort_order) + 1, 0)::int as sort_order,
      count(*)::int as image_count
    from listing_images
    where listing_id = $1::uuid
      and deleted_at is null
  ),
  unset_existing_cover as (
    update listing_images
    set is_cover = false,
        updated_at = now()
    where listing_id = $1::uuid
      and deleted_at is null
      and $5::boolean = true
    returning id
  )
  insert into listing_images (
    listing_id,
    object_key_original,
    mime_type,
    size_bytes,
    sort_order,
    is_cover,
    status
  )
  select
    $1::uuid,
    $2::text,
    $3::text,
    $4::int,
    image_position.sort_order,
    case
      when $5::boolean = true or image_position.image_count = 0 then true
      else false
    end,
    'uploaded'
  from image_position
  returning
    id::text,
    listing_id::text,
    object_key_original,
    object_key_large,
    object_key_thumb,
    mime_type,
    width,
    height,
    size_bytes,
    checksum,
    blur_hash,
    sort_order,
    is_cover,
    status,
    rejection_reason,
    created_at,
    updated_at
`

const getDraftImageSql = `
  select
    listing_image.id::text,
    listing_image.listing_id::text,
    listing_image.object_key_original,
    listing_image.object_key_large,
    listing_image.object_key_thumb,
    listing_image.mime_type,
    listing_image.width,
    listing_image.height,
    listing_image.size_bytes,
    listing_image.checksum,
    listing_image.blur_hash,
    listing_image.sort_order,
    listing_image.is_cover,
    listing_image.status,
    listing_image.rejection_reason,
    listing_image.created_at,
    listing_image.updated_at
  from listing_images listing_image
  join listings listing on listing.id = listing_image.listing_id
  where listing.owner_user_id = $1::uuid
    and listing.id = $2::uuid
    and listing.moderation_status = 'draft'
    and listing.lifecycle_status = 'draft'
    and listing.deleted_at is null
    and listing_image.id = $3::uuid
    and listing_image.deleted_at is null
  limit 1
`

const confirmDraftImageSql = `
  with confirmed as (
    update listing_images
    set
      status = 'processing',
      size_bytes = $4::int,
      checksum = $5::text,
      rejection_reason = null,
      updated_at = now()
    from listings listing
    where listing.id = listing_images.listing_id
      and listing.owner_user_id = $1::uuid
      and listing.id = $2::uuid
      and listing.moderation_status = 'draft'
      and listing.lifecycle_status = 'draft'
      and listing.deleted_at is null
      and listing_images.id = $3::uuid
      and listing_images.status = 'uploaded'
      and listing_images.deleted_at is null
    returning listing_images.*
  )
  select
    id::text,
    listing_id::text,
    object_key_original,
    object_key_large,
    object_key_thumb,
    mime_type,
    width,
    height,
    size_bytes,
    checksum,
    blur_hash,
    sort_order,
    is_cover,
    status,
    rejection_reason,
    created_at,
    updated_at
  from confirmed
`

@Injectable()
export class ListingsService {
  constructor(
    @Inject(DatabaseService)
    private readonly databaseService: DatabaseService,
    @Inject(ObjectStorageService)
    private readonly objectStorageService: ObjectStorageService
  ) {}

  async listPublic(
    query: ListingPublicListQuery
  ): Promise<PublicListingListResponse> {
    const rows = await this.databaseService.queryRows<PublicListingRow>(
      listPublicListingsSql,
      [
        query.pageSize,
        (query.page - 1) * query.pageSize,
        query.breedId ?? null,
        query.municipalityId ?? null,
        query.provinceId ?? null,
        query.regionId ?? null,
        query.sex ?? null,
        query.ageMonthsMin ?? null,
        query.ageMonthsMax ?? null,
        query.isFree ?? null,
        query.isVaccinated ?? null,
        query.isSterilized ?? null,
        query.isDewormed ?? null,
        query.hasMicrochip ?? null,
        query.hasImages ?? null,
      ]
    )
    const total = rows[0]?.total_count ? Number(rows[0].total_count) : 0

    return {
      items: rows.map(mapPublicListingSummaryRow),
      meta: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.ceil(total / query.pageSize),
      },
    }
  }

  async publicDetail(id: string): Promise<PublicListingDetail> {
    const [row] = await this.databaseService.queryRows<PublicListingRow>(
      getPublicListingSql,
      [id]
    )

    if (!row) {
      throw new NotFoundException("Public listing not found.")
    }

    const images = await this.databaseService.queryRows<PublicListingImageRow>(
      listPublicListingImagesSql,
      [id]
    )

    return {
      ...mapPublicListingSummaryRow(row),
      images: {
        ...mapPublicListingImages(row),
        items: images.map(mapPublicListingImageRow),
      },
    }
  }

  async listDrafts(
    userId: string,
    query: ListingDraftListQuery
  ): Promise<ListingDraftListResponse> {
    const rows = await this.databaseService.queryRows<ListingDraftListRow>(
      listUserDraftsSql,
      [userId, query.pageSize, (query.page - 1) * query.pageSize]
    )
    const total = rows[0] ? Number(rows[0].total_count) : 0

    return {
      items: rows.map(mapListingDraftRow),
      meta: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.ceil(total / query.pageSize),
      },
    }
  }

  async draft(userId: string, id: string): Promise<ListingDraft> {
    const [row] = await this.databaseService.queryRows<ListingDraftRow>(
      getUserDraftSql,
      [userId, id]
    )

    if (!row) {
      throw new NotFoundException("Listing draft not found.")
    }

    return mapListingDraftRow(row)
  }

  async createDraft(
    userId: string,
    input: ListingDraftCreateInput
  ): Promise<ListingDraft> {
    const location = await this.resolveMunicipalityLocation(
      input.municipalityId
    )
    const [row] = await this.databaseService.queryRows<ListingDraftRow>(
      createUserDraftSql,
      [
        userId,
        input.title,
        createListingSlug(input.title),
        input.description,
        input.breedId ?? null,
        input.sex,
        input.ageMonthsMin ?? null,
        input.ageMonthsMax ?? null,
        location?.municipalityId ?? null,
        location?.provinceId ?? null,
        location?.regionId ?? null,
        location?.centerLat ?? null,
        location?.centerLng ?? null,
        input.isFree ? null : (input.contributionCents ?? null),
        input.isFree,
        input.isVaccinated ?? null,
        input.isSterilized ?? null,
        input.isDewormed ?? null,
        input.hasMicrochip ?? null,
      ]
    )

    if (!row) {
      throw new BadRequestException("Could not create listing draft.")
    }

    return mapListingDraftRow(row)
  }

  async updateDraft(
    userId: string,
    id: string,
    input: ListingDraftUpdateInput
  ): Promise<ListingDraft> {
    const location = await this.resolveMunicipalityLocation(
      input.municipalityId
    )
    const contribution = resolveContributionUpdate(input)
    const [row] = await this.databaseService.queryRows<ListingDraftRow>(
      updateUserDraftSql,
      [
        id,
        userId,
        Object.hasOwn(input, "title"),
        input.title ?? null,
        input.title ? createListingSlug(input.title) : null,
        Object.hasOwn(input, "description"),
        input.description ?? null,
        Object.hasOwn(input, "breedId"),
        input.breedId ?? null,
        Object.hasOwn(input, "sex"),
        input.sex ?? null,
        Object.hasOwn(input, "ageMonthsMin"),
        input.ageMonthsMin ?? null,
        Object.hasOwn(input, "ageMonthsMax"),
        input.ageMonthsMax ?? null,
        Object.hasOwn(input, "municipalityId"),
        location?.municipalityId ?? null,
        location?.provinceId ?? null,
        location?.regionId ?? null,
        location?.centerLat ?? null,
        location?.centerLng ?? null,
        contribution.hasContribution,
        contribution.contributionCents,
        contribution.hasIsFree,
        contribution.isFree,
        Object.hasOwn(input, "isVaccinated"),
        input.isVaccinated ?? null,
        Object.hasOwn(input, "isSterilized"),
        input.isSterilized ?? null,
        Object.hasOwn(input, "isDewormed"),
        input.isDewormed ?? null,
        Object.hasOwn(input, "hasMicrochip"),
        input.hasMicrochip ?? null,
      ]
    )

    if (!row) {
      throw new NotFoundException("Listing draft not found.")
    }

    return mapListingDraftRow(row)
  }

  async deleteDraft(
    userId: string,
    id: string
  ): Promise<ListingDraftDeleteResponse> {
    const rows = await this.databaseService.queryRows<{ id: string }>(
      deleteUserDraftSql,
      [id, userId]
    )

    if (rows.length === 0) {
      throw new NotFoundException("Listing draft not found.")
    }

    return { deleted: true }
  }

  async submitDraftForReview(
    userId: string,
    id: string
  ): Promise<ListingDraftSubmissionResponse> {
    const [draft] = await this.databaseService.queryRows<ListingDraftRow>(
      getUserDraftSql,
      [userId, id]
    )

    if (!draft) {
      throw new NotFoundException("Listing draft not found.")
    }

    const issues = validateDraftSubmission(draft)

    if (issues.length > 0) {
      throw new BadRequestException({
        message: "Listing draft is not ready for review.",
        issues,
      })
    }

    const imageReadiness = await this.getDraftImageReadiness(draft.id)
    const imageIssues = validateDraftImageReadiness(imageReadiness)

    if (imageIssues.length > 0) {
      throw new BadRequestException({
        message: "Listing draft is not ready for review.",
        issues: imageIssues,
      })
    }

    const duplicates = await this.databaseService.queryRows<{ id: string }>(
      duplicateSubmittedListingSql,
      [userId, id, draft.slug, draft.municipality_id]
    )

    if (duplicates.length > 0) {
      throw new BadRequestException({
        message: "Listing draft is not ready for review.",
        issues: [
          {
            path: ["title"],
            message:
              "Another active listing from this user already uses this title in the same municipality.",
          },
        ],
      })
    }

    const [submitted] =
      await this.databaseService.queryRows<ListingReviewSubmissionRow>(
        submitUserDraftSql,
        [id, userId]
      )

    if (!submitted) {
      throw new BadRequestException("Could not submit listing draft.")
    }

    return {
      submitted: true,
      listing: mapListingReviewSubmissionRow(submitted),
    }
  }

  async createDraftImageUpload(
    userId: string,
    listingId: string,
    input: ListingImageUploadRequestInput
  ): Promise<ListingImageUploadResponse> {
    const draft = await this.draft(userId, listingId)
    const [countRow] =
      await this.databaseService.queryRows<ListingImageCountRow>(
        countDraftImagesSql,
        [userId, listingId]
      )
    const imageCount = countRow ? Number(countRow.image_count) : 0

    if (imageCount >= maxListingImages) {
      throw new BadRequestException({
        message: "Listing draft image limit reached.",
        issues: [
          {
            path: ["listingId"],
            message: `A listing draft can have at most ${maxListingImages} images.`,
          },
        ],
      })
    }

    const upload = await this.objectStorageService.createListingImageUpload(
      draft.id,
      input.mimeType
    )
    const [image] = await this.databaseService.queryRows<ListingImageRow>(
      createDraftImageSql,
      [
        draft.id,
        upload.objectKey,
        input.mimeType,
        input.sizeBytes,
        input.isCover,
      ]
    )

    if (!image) {
      throw new BadRequestException("Could not create listing image upload.")
    }

    return {
      image: mapListingImageRow(image),
      upload: {
        method: "PUT",
        url: upload.url,
        headers: {
          "Content-Type": input.mimeType,
        },
        expiresInSeconds: upload.expiresInSeconds,
        maxSizeBytes: listingImageMaxSizeBytes,
      },
    }
  }

  async confirmDraftImageUpload(
    userId: string,
    listingId: string,
    imageId: string
  ): Promise<ListingImageConfirmationResponse> {
    const [image] = await this.databaseService.queryRows<ListingImageRow>(
      getDraftImageSql,
      [userId, listingId, imageId]
    )

    if (!image) {
      throw new NotFoundException("Listing image not found.")
    }

    if (image.status !== "uploaded") {
      throw new BadRequestException("Listing image upload is not pending.")
    }

    const stat = await this.statListingImageObject(image.object_key_original)

    const [confirmed] = await this.databaseService.queryRows<ListingImageRow>(
      confirmDraftImageSql,
      [userId, listingId, imageId, stat.sizeBytes, stat.checksum]
    )

    if (!confirmed) {
      throw new BadRequestException("Could not confirm listing image upload.")
    }

    return {
      confirmed: true,
      image: mapListingImageRow(confirmed),
    }
  }

  private async resolveMunicipalityLocation(
    municipalityId: ListingDraftCreateInput["municipalityId"]
  ): Promise<MunicipalityLocation | null | undefined> {
    if (municipalityId === undefined) {
      return undefined
    }

    if (municipalityId === null) {
      return null
    }

    const [row] = await this.databaseService.queryRows<MunicipalityLocationRow>(
      activeMunicipalityLocationSql,
      [municipalityId]
    )

    if (!row) {
      throw new BadRequestException("Municipality not found or inactive.")
    }

    return {
      municipalityId: row.municipality_id,
      provinceId: row.province_id,
      regionId: row.region_id,
      centerLat: toNumberOrNull(row.center_lat),
      centerLng: toNumberOrNull(row.center_lng),
    }
  }

  private async statListingImageObject(objectKey: string) {
    try {
      return await this.objectStorageService.statObject(objectKey)
    } catch {
      throw new BadRequestException(
        "Listing image object was not found in storage."
      )
    }
  }

  private async getDraftImageReadiness(listingId: string) {
    const [row] =
      await this.databaseService.queryRows<ListingImageReadinessRow>(
        countDraftImageReadinessSql,
        [listingId]
      )

    return {
      pendingCount: row ? Number(row.pending_count) : 0,
      readyCount: row ? Number(row.ready_count) : 0,
      rejectedCount: row ? Number(row.rejected_count) : 0,
    }
  }
}

export function createListingSlug(title: string): string {
  const slug = title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")

  return slug || "annuncio"
}

function resolveContributionUpdate(input: ListingDraftUpdateInput) {
  const hasContributionInput = Object.hasOwn(input, "contributionCents")
  const hasIsFreeInput = Object.hasOwn(input, "isFree")
  const shouldClearContribution = input.isFree === true
  const shouldMarkPaid =
    hasContributionInput &&
    input.contributionCents !== null &&
    input.contributionCents !== undefined &&
    input.contributionCents > 0

  return {
    hasContribution: hasContributionInput || shouldClearContribution,
    contributionCents: shouldClearContribution
      ? null
      : (input.contributionCents ?? null),
    hasIsFree: hasIsFreeInput || shouldMarkPaid,
    isFree: hasIsFreeInput ? Boolean(input.isFree) : false,
  }
}

function mapListingDraftRow(row: ListingDraftRow): ListingDraft {
  return {
    ...mapListingSharedFields(row),
    moderationStatus: row.moderation_status,
    lifecycleStatus: row.lifecycle_status,
  }
}

function mapListingReviewSubmissionRow(
  row: ListingReviewSubmissionRow
): ListingReviewSubmission {
  return {
    ...mapListingSharedFields(row),
    moderationStatus: row.moderation_status,
    lifecycleStatus: row.lifecycle_status,
  }
}

function mapPublicListingSummaryRow(
  row: PublicListingRow
): PublicListingSummary {
  return {
    ...mapListingSharedFields(row),
    publishedAt: toIsoStringOrNull(row.published_at),
    expiresAt: toIsoStringOrNull(row.expires_at),
    owner: {
      id: row.owner_user_id,
      displayName: row.owner_display_name,
      profileType: row.owner_profile_type,
    },
    stats: {
      likeCount: Number(row.like_count),
    },
    images: mapPublicListingImages(row),
  }
}

function mapListingSharedFields(
  row: ListingDraftRow | ListingReviewSubmissionRow | PublicListingRow
) {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    description: row.description,
    breed:
      row.breed_id && row.breed_name && row.breed_slug
        ? {
            id: row.breed_id,
            name: row.breed_name,
            slug: row.breed_slug,
          }
        : null,
    sex: row.sex,
    ageMonthsMin: row.age_months_min,
    ageMonthsMax: row.age_months_max,
    location: mapListingLocation(row),
    contributionCents: row.contribution_cents,
    isFree: row.is_free,
    isVaccinated: row.is_vaccinated,
    isSterilized: row.is_sterilized,
    isDewormed: row.is_dewormed,
    hasMicrochip: row.has_microchip,
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at),
  }
}

function mapPublicListingImages(
  row: PublicListingRow
): PublicListingSummary["images"] {
  return {
    readyCount: Number(row.ready_image_count),
    cover: row.cover_image_id
      ? {
          id: row.cover_image_id,
          objectKeyLarge: row.cover_object_key_large,
          objectKeyThumb: row.cover_object_key_thumb,
          width: row.cover_width,
          height: row.cover_height,
          blurHash: row.cover_blur_hash,
          sortOrder: row.cover_sort_order ?? 0,
          isCover: row.cover_is_cover ?? true,
        }
      : null,
  }
}

function mapListingLocation(
  row: ListingDraftRow | ListingReviewSubmissionRow | PublicListingRow
): ListingDraftLocation | null {
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
    center: mapLocationCenter(row.location_lat, row.location_lng),
  }
}

function mapLocationCenter(
  lat: number | string | null,
  lng: number | string | null
): ListingDraftLocation["center"] {
  if (lat === null || lng === null) {
    return null
  }

  return {
    lat: Number(lat),
    lng: Number(lng),
  }
}

function toNumberOrNull(value: number | string | null) {
  return value === null ? null : Number(value)
}

function toIsoString(value: Date | string) {
  return new Date(value).toISOString()
}

function toIsoStringOrNull(value: Date | string | null) {
  return value === null ? null : toIsoString(value)
}

function mapListingImageRow(row: ListingImageRow): ListingImage {
  return {
    id: row.id,
    listingId: row.listing_id,
    objectKeyOriginal: row.object_key_original,
    objectKeyLarge: row.object_key_large,
    objectKeyThumb: row.object_key_thumb,
    mimeType: row.mime_type,
    width: row.width,
    height: row.height,
    sizeBytes: row.size_bytes,
    checksum: row.checksum,
    blurHash: row.blur_hash,
    sortOrder: row.sort_order,
    isCover: row.is_cover,
    status: row.status,
    rejectionReason: row.rejection_reason,
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at),
  }
}

function mapPublicListingImageRow(
  row: PublicListingImageRow
): PublicListingImage {
  return {
    id: row.id,
    objectKeyLarge: row.object_key_large,
    objectKeyThumb: row.object_key_thumb,
    width: row.width,
    height: row.height,
    blurHash: row.blur_hash,
    sortOrder: row.sort_order,
    isCover: row.is_cover,
  }
}

function validateDraftSubmission(draft: ListingDraftRow): SubmissionIssue[] {
  const issues: SubmissionIssue[] = []

  if (draft.title.trim().length < 3) {
    issues.push({
      path: ["title"],
      message: "Title is required before review submission.",
    })
  }

  if (draft.description.trim().length < 10) {
    issues.push({
      path: ["description"],
      message: "Description is required before review submission.",
    })
  }

  if (!draft.municipality_id || !draft.province_id || !draft.region_id) {
    issues.push({
      path: ["municipalityId"],
      message: "A valid municipality is required before review submission.",
    })
  }

  if (
    draft.age_months_min !== null &&
    draft.age_months_max !== null &&
    draft.age_months_min > draft.age_months_max
  ) {
    issues.push({
      path: ["ageMonthsMax"],
      message: "Minimum age cannot be greater than maximum age.",
    })
  }

  if (
    draft.is_free &&
    draft.contribution_cents !== null &&
    draft.contribution_cents > 0
  ) {
    issues.push({
      path: ["contributionCents"],
      message: "Free listings cannot require a contribution.",
    })
  }

  if (
    !draft.is_free &&
    (draft.contribution_cents === null || draft.contribution_cents <= 0)
  ) {
    issues.push({
      path: ["contributionCents"],
      message: "Paid listings require a contribution amount.",
    })
  }

  return issues
}

function validateDraftImageReadiness(imageReadiness: {
  pendingCount: number
  readyCount: number
  rejectedCount: number
}): SubmissionIssue[] {
  const issues: SubmissionIssue[] = []

  if (imageReadiness.readyCount === 0) {
    issues.push({
      path: ["images"],
      message:
        "At least one processed image is required before review submission.",
    })
  }

  if (imageReadiness.pendingCount > 0) {
    issues.push({
      path: ["images"],
      message:
        "All uploaded images must finish processing before review submission.",
    })
  }

  if (imageReadiness.rejectedCount > 0) {
    issues.push({
      path: ["images"],
      message: "Rejected images must be removed before review submission.",
    })
  }

  return issues
}
