import { randomInt } from "node:crypto"
import { performance } from "node:perf_hooks"

import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
  ServiceUnavailableException,
} from "@nestjs/common"
import { listingImageMaxSizeBytes } from "@workspace/validation"
import type {
  ListingContactPhoneMode,
  ListingDraftCreateInput,
  ListingDraftListQuery,
  ListingDraftUpdateInput,
  ListingImageOrderInput,
  ListingImageUploadRequestInput,
  ListingPhoneVerificationConfirmInput,
  ListingPublicListQuery,
  ListingPublicSort,
  ListingSex,
} from "@workspace/validation"

import { hashPassword, verifyPassword } from "../auth/auth.service.js"
import { API_ENV } from "../config/config.module.js"
import type { ApiEnv } from "../config/env.js"
import { DatabaseService } from "../database/database.service.js"
import { NotificationsService } from "../notifications/notifications.service.js"
import { ObservabilityService } from "../observability/observability.service.js"
import { ObjectStorageService } from "../storage/object-storage.service.js"
import type {
  ListingDraft,
  ListingDraftDeleteResponse,
  ListingDraftListResponse,
  ListingDraftLocation,
  ListingDraftSubmissionResponse,
  ListingImage,
  ListingImageCoverResponse,
  ListingImageConfirmationResponse,
  ListingImageDeleteResponse,
  ListingImageListResponse,
  ListingImageOrderResponse,
  ListingImageUploadResponse,
  ListingPhoneVerificationConfirmResponse,
  ListingPhoneVerificationRequestResponse,
  PublicCatBreed,
  PublicListingDetail,
  PublicListingImage,
  PublicListingListResponse,
  PublicListingSummary,
  ListingReviewSubmission,
} from "./listings.types.js"

const maxListingImages = 10
const publicListingRankingVersion = "postgres-v1" as const
const defaultPublicListingRadiusKm = 50

type ListingsEnv = Pick<ApiEnv, "APP_ENV" | "PHONE_VERIFICATION_TTL_MINUTES">

const defaultListingsEnv: ListingsEnv = {
  APP_ENV: "local",
  PHONE_VERIFICATION_TTL_MINUTES: 10,
}

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
  contact_requests_enabled: boolean
  contact_phone_mode: ListingContactPhoneMode
  contact_phone_e164: string | null
  contact_phone_verified_at: Date | string | null
  moderation_status: ModerationStatus
  lifecycle_status: LifecycleStatus
  created_at: Date | string
  updated_at: Date | string
}

type ListingDraftRow = ListingOwnerRow<"draft", "draft">

type EditableListingDraftRow = ListingOwnerRow<
  "draft" | "pending_review",
  "draft"
>

type ListingReviewSubmissionRow = ListingOwnerRow<"pending_review", "draft">

type ListingDraftListRow = EditableListingDraftRow & {
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
  favorite_count: number | string
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
  cover_blur_data_url: string | null
  cover_sort_order: number | null
  cover_is_cover: boolean | null
  preview_images: unknown
  is_sponsored: boolean
  sponsorship_label: string | null
  sponsorship_placement: string | null
  public_phone_e164: string | null
}

type ResolvedPublicListingQuery = {
  distanceLat: number | null
  distanceLng: number | null
  radiusKm: number | null
  sort: ListingPublicSort
}

type PublicListingSuggestionReason =
  NonNullable<PublicListingListResponse["suggestions"]>["reason"]

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
  blur_data_url: string | null
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
  blur_data_url: string | null
  sort_order: number
  is_cover: boolean
}

type PublicCatBreedRow = {
  id: string
  name: string
  slug: string
}

type ListingPhoneVerificationCodeRow = {
  id: string
  phone_e164: string
  code_hash: string
}

type ListingPhoneVerificationRequestRow = {
  phone_e164: string | null
  contact_phone_verified_at: Date | string | null
  code_id: string | null
  expires_at: Date | string | null
}

type ListingPhoneVerificationConfirmRow = {
  contact_phone_verified_at: Date | string
}

type CurrentUserPhoneForListingRow = {
  phone_e164: string | null
  phone_verified_at: Date | string | null
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
  listing.contact_requests_enabled,
  listing.contact_phone_mode::text as contact_phone_mode,
  listing.contact_phone_e164,
  listing.contact_phone_verified_at,
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
  listing.contact_requests_enabled,
  listing.contact_phone_mode::text as contact_phone_mode,
  listing.contact_phone_e164,
  listing.contact_phone_verified_at,
  case
    when listing.contact_phone_mode = 'account'
      and owner.phone_e164 is not null
      and owner.phone_verified_at is not null
    then owner.phone_e164
    when listing.contact_phone_mode = 'listing'
      and listing.contact_phone_e164 is not null
      and listing.contact_phone_verified_at is not null
    then listing.contact_phone_e164
    else null
  end as public_phone_e164,
  listing.published_at,
  listing.expires_at,
  listing.created_at,
  listing.updated_at,
  owner.id::text as owner_user_id,
  owner.display_name as owner_display_name,
  owner.profile_type::text as owner_profile_type,
  coalesce(favorite_counts.favorite_count, 0)::int as favorite_count,
  coalesce(like_counts.like_count, 0)::int as like_count,
  coalesce(ready_images.ready_image_count, 0)::int as ready_image_count,
  cover_images.cover_image_id,
  cover_images.object_key_large as cover_object_key_large,
  cover_images.object_key_thumb as cover_object_key_thumb,
  cover_images.width as cover_width,
  cover_images.height as cover_height,
  cover_images.blur_hash as cover_blur_hash,
  cover_images.blur_data_url as cover_blur_data_url,
  cover_images.sort_order as cover_sort_order,
  cover_images.is_cover as cover_is_cover,
  coalesce(preview_images.preview_images, '[]'::jsonb) as preview_images,
  (active_promotions.listing_id is not null)::boolean as is_sponsored,
  active_promotions.label as sponsorship_label,
  active_promotions.placement as sponsorship_placement
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
  left join listing_search_documents search_document
    on search_document.listing_id = listing.id
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
      blur_data_url,
      sort_order,
      is_cover
    from listing_images
    where status = 'ready'
      and deleted_at is null
      and is_cover = true
    order by listing_id, sort_order, created_at
  ) cover_images on cover_images.listing_id = listing.id
  left join lateral (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', preview.id::text,
          'object_key_large', preview.object_key_large,
          'object_key_thumb', preview.object_key_thumb,
          'width', preview.width,
          'height', preview.height,
          'blur_hash', preview.blur_hash,
          'blur_data_url', preview.blur_data_url,
          'sort_order', preview.sort_order,
          'is_cover', preview.is_cover
        )
        order by preview.is_cover desc, preview.sort_order asc, preview.created_at asc, preview.id asc
      ),
      '[]'::jsonb
    ) as preview_images
    from (
      select
        id,
        object_key_large,
        object_key_thumb,
        width,
        height,
        blur_hash,
        blur_data_url,
        sort_order,
        is_cover,
        created_at
      from listing_images
      where listing_id = listing.id
        and status = 'ready'
        and deleted_at is null
      order by is_cover desc, sort_order asc, created_at asc, id asc
      limit 4
    ) preview
  ) preview_images on true
  left join (
    select
      listing_id,
      count(*)::int as favorite_count
    from listing_favorites
    group by listing_id
  ) favorite_counts on favorite_counts.listing_id = listing.id
  left join (
    select
      listing_id,
      count(*)::int as like_count
    from listing_likes
    group by listing_id
  ) like_counts on like_counts.listing_id = listing.id
  left join (
    select distinct on (listing_id)
      listing_id,
      label,
      placement,
      priority
    from listing_promotions
    where placement = 'listings_top'
      and is_active = true
      and deleted_at is null
      and starts_at <= now()
      and (ends_at is null or ends_at > now())
    order by listing_id, priority desc, starts_at desc, id
  ) active_promotions on active_promotions.listing_id = listing.id
`

const publicListingInlineSearchVectorSql = `
  setweight(
    to_tsvector(
      'italian',
      unaccent(concat_ws(' ', listing.title, coalesce(breed.name, '')))
    ),
    'A'
  ) ||
  setweight(
    to_tsvector(
      'italian',
      unaccent(
        concat_ws(
          ' ',
          coalesce(municipality.name, ''),
          coalesce(province.name, ''),
          coalesce(region.name, '')
        )
      )
    ),
    'B'
  ) ||
  setweight(
    to_tsvector('italian', unaccent(coalesce(listing.description, ''))),
    'C'
  )
`

const publicListingSearchVectorSql = `
  coalesce(
    search_document.search_vector,
    ${publicListingInlineSearchVectorSql}
  )
`

const publicListingInlineSearchTextSql = `
  concat_ws(
    ' ',
    listing.title,
    coalesce(breed.name, ''),
    coalesce(municipality.name, ''),
    coalesce(province.name, ''),
    coalesce(region.name, ''),
    listing.description
  )
`

const publicListingSearchTextSql = `
  coalesce(
    search_document.search_text,
    ${publicListingInlineSearchTextSql}
  )
`

const publicListingNormalizedSearchTextSql = `
  regexp_replace(
    lower(unaccent((${publicListingSearchTextSql}))),
    '[^a-z0-9]+',
    ' ',
    'g'
  )
`

const publicListingNormalizedSearchQuerySql = `
  regexp_replace(
    lower(unaccent($16::text)),
    '[^a-z0-9]+',
    ' ',
    'g'
  )
`

const publicListingTrigramScoreSql = `
  greatest(
    similarity(
      (${publicListingNormalizedSearchTextSql}),
      (${publicListingNormalizedSearchQuerySql})
    ),
    word_similarity(
      (${publicListingNormalizedSearchQuerySql}),
      (${publicListingNormalizedSearchTextSql})
    )
  )
`

const publicListingDistanceMetersSql = `
  case
    when $17::float8 is null
      or $18::float8 is null
      or listing.location_point is null
    then null
    else ST_Distance(
      listing.location_point::geography,
      ST_SetSRID(ST_MakePoint($18::float8, $17::float8), 4326)::geography
    )
  end
`

const publicListingTextScoreSql = `
  case
    when $16::text is null then 0
    else ts_rank_cd(
      (${publicListingSearchVectorSql}),
      websearch_to_tsquery('italian', unaccent($16::text))
    )
  end
`

const publicListingDistanceScoreSql = `
  case
    when (${publicListingDistanceMetersSql}) is null then 0
    else greatest(
      0,
      1 - (
        (${publicListingDistanceMetersSql}) /
        greatest(coalesce($19::float8, ${defaultPublicListingRadiusKm}), 1) /
        1000
      )
    )
  end
`

const publicListingFreshnessScoreSql = `
  1 / (
    1 + (
      greatest(
        0,
        extract(epoch from (now() - coalesce(listing.published_at, listing.updated_at)))
      ) / 86400 / 30
    )
  )
`

const publicListingEngagementScoreSql = `
  least(1, ln(1 + greatest(coalesce(search_document.like_count, like_counts.like_count, 0), 0)) / ln(101))
`

const publicListingRankingScoreSql = `
  (${publicListingTextScoreSql}) * 0.45
  + (${publicListingDistanceScoreSql}) * 0.20
  + (${publicListingFreshnessScoreSql}) * 0.15
  + (coalesce(search_document.quality_score, 0)::float8 / 100) * 0.12
  + (coalesce(search_document.trust_score, 0)::float8 / 100) * 0.05
  + (${publicListingEngagementScoreSql}) * 0.03
`

const activeDraftWhereSql = `
  listing.owner_user_id = $1::uuid
  and listing.moderation_status = 'draft'
  and listing.lifecycle_status = 'draft'
  and listing.deleted_at is null
`

const activeEditableDraftWhereSql = `
  listing.owner_user_id = $1::uuid
  and listing.moderation_status in ('draft', 'pending_review')
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

const publicListingExplicitFiltersSql = `
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
  and (
    $21::int is null
    or (
      listing.is_free = false
      and listing.contribution_cents is not null
      and listing.contribution_cents >= $21::int
    )
  )
  and (
    $22::int is null
    or (
      listing.is_free = false
      and listing.contribution_cents is not null
      and listing.contribution_cents <= $22::int
    )
  )
  and ($11::boolean is null or listing.is_vaccinated = $11::boolean)
  and ($12::boolean is null or listing.is_sterilized = $12::boolean)
  and ($13::boolean is null or listing.is_dewormed = $13::boolean)
  and ($14::boolean is null or listing.has_microchip = $14::boolean)
  and (
    $15::boolean is null
    or (coalesce(ready_images.ready_image_count, 0) > 0) = $15::boolean
  )
`

const publicListingGeoFilterSql = `
  and (
    $17::float8 is null
    or $18::float8 is null
    or $19::float8 is null
    or (
      listing.location_point is not null
      and ST_DWithin(
        listing.location_point::geography,
        ST_SetSRID(ST_MakePoint($18::float8, $17::float8), 4326)::geography,
        $19::float8 * 1000
      )
    )
  )
`

const publicListingFallbackParameterAnchorSql = `
  and ($3::uuid is null or $3::uuid is not null)
  and ($4::uuid is null or $4::uuid is not null)
  and ($5::uuid is null or $5::uuid is not null)
  and ($6::uuid is null or $6::uuid is not null)
  and ($7::listing_sex is null or $7::listing_sex is not null)
  and ($8::int is null or $8::int is not null)
  and ($9::int is null or $9::int is not null)
  and ($10::boolean is null or $10::boolean is not null)
  and ($11::boolean is null or $11::boolean is not null)
  and ($12::boolean is null or $12::boolean is not null)
  and ($13::boolean is null or $13::boolean is not null)
  and ($14::boolean is null or $14::boolean is not null)
  and ($15::boolean is null or $15::boolean is not null)
  and ($16::text is null or $16::text is not null)
  and ($17::float8 is null or $17::float8 is not null)
  and ($18::float8 is null or $18::float8 is not null)
  and ($19::float8 is null or $19::float8 is not null)
  and ($20::text is null or $20::text is not null)
  and ($21::int is null or $21::int is not null)
  and ($22::int is null or $22::int is not null)
`

const publicListingOrderSql = `
  order by
    active_promotions.priority desc nulls last,
    case
      when $20::text = 'distance' then (${publicListingDistanceMetersSql})
      else null
    end asc nulls last,
    case
      when $20::text = 'relevance' then (${publicListingRankingScoreSql})
    end desc nulls last,
    case
      when $20::text = 'recent' then listing.published_at
    end desc nulls last,
    listing.published_at desc nulls last,
    listing.updated_at desc,
    listing.id
`

const publicListingRequestedLocationRankSql = `
  case
    when $4::uuid is not null and listing.municipality_id = $4::uuid then 0
    when $5::uuid is not null and listing.province_id = $5::uuid then 1
    when $6::uuid is not null and listing.region_id = $6::uuid then 2
    else 3
  end
`

const publicListingSuggestionOrderSql = `
  order by
    active_promotions.priority desc nulls last,
    case
      when $17::float8 is not null and $18::float8 is not null
      then (${publicListingDistanceMetersSql})
      else null
    end asc nulls last,
    (${publicListingRequestedLocationRankSql}) asc,
    case
      when $16::text is not null then (${publicListingTrigramScoreSql})
      else null
    end desc nulls last,
    (${publicListingRankingScoreSql}) desc nulls last,
    listing.published_at desc nulls last,
    listing.updated_at desc,
    listing.id
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
  where ${activeEditableDraftWhereSql}
  order by listing.updated_at desc, listing.created_at desc, listing.id
  limit $2::int
  offset $3::int
`

const getUserDraftSql = `
  select ${listingDraftSelectFields}
  from listings listing
  ${listingDraftJoins}
  where ${activeEditableDraftWhereSql}
    and listing.id = $2::uuid
  limit 1
`

const getUserDraftForSubmissionSql = `
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
    ${publicListingExplicitFiltersSql}
    and (
      $16::text is null
      or (${publicListingSearchVectorSql})
        @@ websearch_to_tsquery('italian', unaccent($16::text))
    )
    ${publicListingGeoFilterSql}
  ${publicListingOrderSql}
  limit $1::int
  offset $2::int
`

const listPublicListingSuggestionsSql = `
  select
    ${publicListingSelectFields}
  from listings listing
  ${publicListingJoins}
  where ${publicListingWhereSql}
    ${publicListingFallbackParameterAnchorSql}
    and not (listing.id = any($23::uuid[]))
  ${publicListingSuggestionOrderSql}
  limit $24::int
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
    blur_data_url,
    sort_order,
    is_cover
  from listing_images
  where listing_id = $1::uuid
    and status = 'ready'
    and deleted_at is null
  order by sort_order asc, created_at asc, id asc
`

const listPublicCatBreedsSql = `
  select
    id::text,
    name,
    slug
  from cat_breeds
  where is_active = true
  order by sort_order asc, name asc, id asc
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
      has_microchip,
      contact_requests_enabled,
      contact_phone_mode,
      contact_phone_e164
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
      $19::boolean,
      $20::boolean,
      $21::listing_contact_phone_mode,
      case
        when $21::listing_contact_phone_mode = 'listing' then $22::text
        else null
      end
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
      contact_requests_enabled = case
        when $34::boolean then $35::boolean
        else contact_requests_enabled
      end,
      contact_phone_mode = case
        when $36::boolean then $37::listing_contact_phone_mode
        else contact_phone_mode
      end,
      contact_phone_e164 = case
        when $36::boolean then
          case
            when $37::listing_contact_phone_mode = 'listing' then $38::text
            else null
          end
        else contact_phone_e164
      end,
      contact_phone_verified_at = case
        when $36::boolean
          and (
            $37::listing_contact_phone_mode <> 'listing'
            or $38::text is distinct from contact_phone_e164
          )
        then null
        else contact_phone_verified_at
      end,
      updated_at = now()
    where id = $1::uuid
      and owner_user_id = $2::uuid
      and moderation_status in ('draft', 'pending_review')
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
  where ${activeEditableDraftWhereSql}
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

const createListingPhoneVerificationCodeSql = `
  with target_listing as (
    select
      listing.id,
      listing.owner_user_id,
      listing.contact_phone_e164,
      listing.contact_phone_verified_at
    from listings listing
    where listing.id = $2::uuid
      and listing.owner_user_id = $1::uuid
      and listing.contact_phone_mode = 'listing'
      and listing.deleted_at is null
      and listing.lifecycle_status = 'draft'
      and listing.moderation_status in ('draft', 'pending_review')
    limit 1
  ),
  consumed_existing as (
    update listing_phone_verification_codes
    set consumed_at = now(),
        updated_at = now()
    where listing_id = (select id from target_listing)
      and user_id = $1::uuid
      and consumed_at is null
    returning id
  ),
  inserted_code as (
    insert into listing_phone_verification_codes (
      user_id,
      listing_id,
      phone_e164,
      code_hash,
      expires_at
    )
    select
      target_listing.owner_user_id,
      target_listing.id,
      target_listing.contact_phone_e164,
      $3,
      $4
    from target_listing
    where target_listing.contact_phone_e164 is not null
      and target_listing.contact_phone_verified_at is null
    returning id::text as code_id, expires_at
  )
  select
    target_listing.contact_phone_e164 as phone_e164,
    target_listing.contact_phone_verified_at,
    inserted_code.code_id,
    inserted_code.expires_at
  from target_listing
  left join inserted_code on true
`

const activeListingPhoneVerificationCodeSql = `
  select id::text, phone_e164, code_hash
  from listing_phone_verification_codes
  where user_id = $1::uuid
    and listing_id = $2::uuid
    and consumed_at is null
    and expires_at > now()
  order by created_at desc
  limit 1
`

const confirmListingPhoneVerificationCodeSql = `
  with consumed_code as (
    update listing_phone_verification_codes
    set consumed_at = now(),
        updated_at = now()
    where id = $3::uuid
      and user_id = $1::uuid
      and listing_id = $2::uuid
      and consumed_at is null
      and expires_at > now()
    returning phone_e164
  ),
  updated_listing as (
    update listings
    set contact_phone_verified_at = now(),
        updated_at = now()
    from consumed_code
    where listings.id = $2::uuid
      and listings.owner_user_id = $1::uuid
      and listings.contact_phone_mode = 'listing'
      and listings.contact_phone_e164 = consumed_code.phone_e164
      and listings.deleted_at is null
      and listings.lifecycle_status = 'draft'
      and listings.moderation_status in ('draft', 'pending_review')
    returning listings.contact_phone_verified_at
  )
  select contact_phone_verified_at
  from updated_listing
`

const currentUserPhoneForListingSql = `
  select phone_e164, phone_verified_at
  from users
  where id = $1::uuid
    and deleted_at is null
  limit 1
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
    blur_data_url,
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
    listing_image.blur_data_url,
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
    and listing.moderation_status in ('draft', 'pending_review')
    and listing.lifecycle_status = 'draft'
    and listing.deleted_at is null
    and listing_image.id = $3::uuid
    and listing_image.deleted_at is null
  limit 1
`

const listDraftImagesSql = `
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
    listing_image.blur_data_url,
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
    and listing.moderation_status in ('draft', 'pending_review')
    and listing.lifecycle_status = 'draft'
    and listing.deleted_at is null
    and listing_image.deleted_at is null
  order by listing_image.sort_order asc, listing_image.created_at asc, listing_image.id asc
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
      and listing.moderation_status in ('draft', 'pending_review')
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
    blur_data_url,
    sort_order,
    is_cover,
    status,
    rejection_reason,
    created_at,
    updated_at
  from confirmed
`

const deleteDraftImageSql = `
  with target as (
    select listing_image.id, listing_image.is_cover
    from listing_images listing_image
    join listings listing on listing.id = listing_image.listing_id
    where listing.owner_user_id = $1::uuid
      and listing.id = $2::uuid
      and listing.moderation_status in ('draft', 'pending_review')
      and listing.lifecycle_status = 'draft'
      and listing.deleted_at is null
      and listing_image.id = $3::uuid
      and listing_image.deleted_at is null
    limit 1
  ),
  deleted as (
    update listing_images listing_image
    set
      status = 'deleted',
      is_cover = false,
      deleted_at = now(),
      updated_at = now()
    from target
    where listing_image.id = target.id
    returning listing_image.id::text, target.is_cover
  ),
  next_cover as (
    update listing_images listing_image
    set
      is_cover = true,
      updated_at = now()
    where listing_image.id = (
      select candidate.id
      from listing_images candidate
      where candidate.listing_id = $2::uuid
        and candidate.id <> (select target.id from target)
        and candidate.deleted_at is null
        and exists (select 1 from deleted where is_cover = true)
      order by candidate.sort_order asc, candidate.created_at asc, candidate.id asc
      limit 1
    )
    returning listing_image.id::text
  )
  select
    deleted.id,
    (select next_cover.id from next_cover limit 1) as cover_image_id
  from deleted
`

const reorderDraftImagesSql = `
  with requested as (
    select
      image_order.id::uuid,
      image_order.sort_order::int
    from jsonb_to_recordset($3::jsonb) as image_order(id text, sort_order int)
  )
  update listing_images listing_image
  set
    sort_order = requested.sort_order,
    updated_at = now()
  from requested, listings listing
  where listing.id = listing_image.listing_id
    and listing.owner_user_id = $1::uuid
    and listing.id = $2::uuid
    and listing.moderation_status in ('draft', 'pending_review')
    and listing.lifecycle_status = 'draft'
    and listing.deleted_at is null
    and listing_image.id = requested.id
    and listing_image.deleted_at is null
  returning listing_image.id::text
`

const setDraftImageCoverSql = `
  with target as (
    select listing_image.id
    from listing_images listing_image
    join listings listing on listing.id = listing_image.listing_id
    where listing.owner_user_id = $1::uuid
      and listing.id = $2::uuid
      and listing.moderation_status in ('draft', 'pending_review')
      and listing.lifecycle_status = 'draft'
      and listing.deleted_at is null
      and listing_image.id = $3::uuid
      and listing_image.deleted_at is null
    limit 1
  ),
  updated as (
    update listing_images listing_image
    set
      is_cover = listing_image.id = (select target.id from target),
      updated_at = now()
    where listing_image.listing_id = $2::uuid
      and listing_image.deleted_at is null
      and exists (select 1 from target)
    returning listing_image.*
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
    blur_data_url,
    sort_order,
    is_cover,
    status,
    rejection_reason,
    created_at,
    updated_at
  from updated
  where id = (select target.id from target)
`

@Injectable()
export class ListingsService {
  private readonly logger = new Logger(ListingsService.name)

  constructor(
    @Inject(DatabaseService)
    private readonly databaseService: DatabaseService,
    @Inject(ObjectStorageService)
    private readonly objectStorageService: ObjectStorageService,
    @Optional()
    @Inject(NotificationsService)
    private readonly notificationsService?: NotificationsService,
    @Inject(API_ENV)
    private readonly env: ListingsEnv = defaultListingsEnv,
    @Optional()
    @Inject(ObservabilityService)
    private readonly observabilityService?: ObservabilityService
  ) {}

  async listPublic(
    query: ListingPublicListQuery
  ): Promise<PublicListingListResponse> {
    const startedAt = performance.now()
    const resolvedQuery = resolvePublicListingQuery(query)
    const parameters: NonNullable<
      Parameters<DatabaseService["queryRows"]>[1]
    > = [
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
      query.q ?? null,
      resolvedQuery.distanceLat,
      resolvedQuery.distanceLng,
      resolvedQuery.radiusKm,
      resolvedQuery.sort,
      query.contributionCentsMin ?? null,
      query.contributionCentsMax ?? null,
    ]
    const rows = await this.databaseService.queryRows<PublicListingRow>(
      listPublicListingsSql,
      parameters
    )
    const total = rows[0]?.total_count ? Number(rows[0].total_count) : 0
    const suggestions = await this.listPublicSuggestions(
      query,
      parameters,
      rows,
      total
    )

    const response = {
      items: rows.map(mapPublicListingSummaryRow),
      suggestions,
      meta: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.ceil(total / query.pageSize),
        query: query.q ?? null,
        sort: resolvedQuery.sort,
        rankingVersion: publicListingRankingVersion,
        expansion: null,
      },
    }

    this.observabilityService?.recordPublicListingSearch({
      durationMs: Math.round(performance.now() - startedAt),
      expansionType: suggestions?.reason ?? null,
      hasGeo: hasDistanceFallbackIntent(resolvedQuery),
      queryPresent: Boolean(query.q),
      resultCount: response.items.length,
      sort: resolvedQuery.sort,
    })

    return response
  }

  private async listPublicSuggestions(
    query: ListingPublicListQuery,
    parameters: NonNullable<Parameters<DatabaseService["queryRows"]>[1]>,
    exactRows: PublicListingRow[],
    exactTotal: number
  ): Promise<PublicListingListResponse["suggestions"]> {
    if (!hasPublicListingFallbackIntent(query)) {
      return null
    }

    const reason = resolveSuggestionReason(query, exactTotal, exactRows.length)

    if (!reason) {
      return null
    }

    const suggestionLimit =
      reason === "not_enough_results"
        ? query.pageSize - exactRows.length
        : query.pageSize

    if (suggestionLimit <= 0) {
      return null
    }

    const excludedIds = exactRows.map((row) => row.id)
    const rows = await this.databaseService.queryRows<PublicListingRow>(
      listPublicListingSuggestionsSql,
      [...parameters, excludedIds, suggestionLimit]
    )

    if (rows.length === 0) {
      return null
    }

    return {
      title: "Potrebbero interessarti anche",
      reason,
      items: rows.map(mapPublicListingSummaryRow),
    }
  }

  async listPublicCatBreeds(): Promise<PublicCatBreed[]> {
    const rows = await this.databaseService.queryRows<PublicCatBreedRow>(
      listPublicCatBreedsSql,
      []
    )

    return rows.map(mapPublicCatBreedRow)
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
    const [row] = await this.databaseService.queryRows<EditableListingDraftRow>(
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
        input.ageMonths ?? null,
        input.ageMonths ?? null,
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
        input.contactRequestsEnabled,
        input.contactPhoneMode ?? "none",
        input.contactPhoneE164 ?? null,
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
    const [row] = await this.databaseService.queryRows<EditableListingDraftRow>(
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
        Object.hasOwn(input, "ageMonths"),
        input.ageMonths ?? null,
        Object.hasOwn(input, "ageMonths"),
        input.ageMonths ?? null,
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
        Object.hasOwn(input, "contactRequestsEnabled"),
        input.contactRequestsEnabled ?? null,
        Object.hasOwn(input, "contactPhoneMode"),
        input.contactPhoneMode ?? null,
        input.contactPhoneE164 ?? null,
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

  async requestDraftPhoneVerification(
    userId: string,
    id: string
  ): Promise<ListingPhoneVerificationRequestResponse> {
    const code = createPhoneVerificationCode()
    const expiresAt = new Date(
      Date.now() + this.env.PHONE_VERIFICATION_TTL_MINUTES * 60 * 1000
    ).toISOString()
    const [row] =
      await this.databaseService.queryRows<ListingPhoneVerificationRequestRow>(
        createListingPhoneVerificationCodeSql,
        [userId, id, await hashPassword(code), expiresAt]
      )

    if (!row) {
      throw new NotFoundException("Listing draft not found.")
    }

    if (!row.phone_e164) {
      throw new BadRequestException("Listing phone number is required.")
    }

    if (!row.code_id || !row.expires_at) {
      return {
        alreadyVerified: true,
        expiresAt: null,
        sent: false,
      }
    }

    await this.sendPhoneVerificationCode(row.phone_e164, code)

    return {
      alreadyVerified: false,
      devCode: canExposePhoneVerificationCode(this.env) ? code : undefined,
      expiresAt: toIsoString(row.expires_at),
      sent: true,
    }
  }

  async confirmDraftPhoneVerification(
    userId: string,
    id: string,
    input: ListingPhoneVerificationConfirmInput
  ): Promise<ListingPhoneVerificationConfirmResponse> {
    const [codeRow] =
      await this.databaseService.queryRows<ListingPhoneVerificationCodeRow>(
        activeListingPhoneVerificationCodeSql,
        [userId, id]
      )

    if (!codeRow) {
      throw new BadRequestException(
        "Invalid or expired listing phone verification code."
      )
    }

    const codeMatches = await verifyPassword(input.code, codeRow.code_hash)

    if (!codeMatches) {
      throw new BadRequestException(
        "Invalid or expired listing phone verification code."
      )
    }

    const [row] =
      await this.databaseService.queryRows<ListingPhoneVerificationConfirmRow>(
        confirmListingPhoneVerificationCodeSql,
        [userId, id, codeRow.id]
      )

    if (!row) {
      throw new BadRequestException(
        "Listing phone number changed before verification."
      )
    }

    return {
      phoneVerifiedAt: toIsoString(row.contact_phone_verified_at),
      verified: true,
    }
  }

  async submitDraftForReview(
    userId: string,
    id: string
  ): Promise<ListingDraftSubmissionResponse> {
    const [draft] = await this.databaseService.queryRows<ListingDraftRow>(
      getUserDraftForSubmissionSql,
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

    const phoneIssues = await this.validateDraftPhoneReadiness(userId, draft)

    if (phoneIssues.length > 0) {
      throw new BadRequestException({
        message: "Listing draft is not ready for review.",
        issues: phoneIssues,
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

    await this.notificationsService?.createListingReviewSubmissionNotification(
      userId,
      {
        listingId: submitted.id,
        listingSlug: submitted.slug,
        listingTitle: submitted.title,
        moderationStatus: "pending_review",
      }
    )

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

  async listDraftImages(
    userId: string,
    listingId: string
  ): Promise<ListingImageListResponse> {
    const draft = await this.draft(userId, listingId)
    const rows = await this.databaseService.queryRows<ListingImageRow>(
      listDraftImagesSql,
      [userId, draft.id]
    )

    return mapListingImageListResponse(rows)
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

  async deleteDraftImage(
    userId: string,
    listingId: string,
    imageId: string
  ): Promise<ListingImageDeleteResponse> {
    const [deleted] = await this.databaseService.queryRows<{
      id: string
      cover_image_id: string | null
    }>(deleteDraftImageSql, [userId, listingId, imageId])

    if (!deleted) {
      throw new NotFoundException("Listing image not found.")
    }

    return {
      deleted: true,
      imageId: deleted.id,
      images: await this.listDraftImages(userId, listingId),
    }
  }

  async reorderDraftImages(
    userId: string,
    listingId: string,
    input: ListingImageOrderInput
  ): Promise<ListingImageOrderResponse> {
    const currentImages = await this.listDraftImages(userId, listingId)

    if (!hasSameImageSet(currentImages.items, input.imageIds)) {
      throw new BadRequestException({
        message: "Listing image order must include every active draft image.",
        issues: [
          {
            path: ["imageIds"],
            message:
              "Provide each active draft image exactly once before reordering.",
          },
        ],
      })
    }

    await this.databaseService.queryRows<{ id: string }>(
      reorderDraftImagesSql,
      [
        userId,
        listingId,
        JSON.stringify(
          input.imageIds.map((id, index) => ({
            id,
            sort_order: index,
          }))
        ),
      ]
    )

    return {
      images: await this.listDraftImages(userId, listingId),
    }
  }

  async setDraftImageCover(
    userId: string,
    listingId: string,
    imageId: string
  ): Promise<ListingImageCoverResponse> {
    const [image] = await this.databaseService.queryRows<ListingImageRow>(
      setDraftImageCoverSql,
      [userId, listingId, imageId]
    )

    if (!image) {
      throw new NotFoundException("Listing image not found.")
    }

    return {
      image: mapListingImageRow(image),
      images: await this.listDraftImages(userId, listingId),
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

  private async validateDraftPhoneReadiness(
    userId: string,
    draft: ListingDraftRow
  ): Promise<SubmissionIssue[]> {
    if (draft.contact_phone_mode === "none") {
      return []
    }

    if (draft.contact_phone_mode === "account") {
      const [userPhone] =
        await this.databaseService.queryRows<CurrentUserPhoneForListingRow>(
          currentUserPhoneForListingSql,
          [userId]
        )

      if (!userPhone?.phone_e164 || !userPhone.phone_verified_at) {
        return [
          {
            path: ["contactPhoneMode"],
            message:
              "Account phone must be added and verified before review submission.",
          },
        ]
      }

      return []
    }

    if (!draft.contact_phone_e164 || !draft.contact_phone_verified_at) {
      return [
        {
          path: ["contactPhoneE164"],
          message:
            "Listing phone number must be verified before review submission.",
        },
      ]
    }

    return []
  }

  private async sendPhoneVerificationCode(phoneE164: string, code: string) {
    if (!canExposePhoneVerificationCode(this.env)) {
      throw new ServiceUnavailableException(
        "Phone verification SMS provider is not configured."
      )
    }

    if (this.env.APP_ENV === "local" && process.env.NODE_ENV !== "test") {
      this.logger.log(
        `Listing phone verification code for ${phoneE164}: ${code}`
      )
    }
  }
}

function createPhoneVerificationCode() {
  return randomInt(0, 1_000_000).toString().padStart(6, "0")
}

function canExposePhoneVerificationCode(env: ListingsEnv) {
  return env.APP_ENV === "local" || env.APP_ENV === "test"
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

function mapListingDraftRow(row: EditableListingDraftRow): ListingDraft {
  return {
    ...mapListingSharedFields(row),
    contactPhone: mapListingContactPhone(row),
    moderationStatus: row.moderation_status,
    lifecycleStatus: row.lifecycle_status,
  }
}

function mapListingReviewSubmissionRow(
  row: ListingReviewSubmissionRow
): ListingReviewSubmission {
  return {
    ...mapListingSharedFields(row),
    contactPhone: mapListingContactPhone(row),
    moderationStatus: row.moderation_status,
    lifecycleStatus: row.lifecycle_status,
  }
}

function mapPublicListingSummaryRow(
  row: PublicListingRow
): PublicListingSummary {
  return {
    ...mapListingSharedFields(row),
    publicPhoneE164: row.public_phone_e164,
    publishedAt: toIsoStringOrNull(row.published_at),
    expiresAt: toIsoStringOrNull(row.expires_at),
    owner: {
      id: row.owner_user_id,
      displayName: row.owner_display_name,
      profileType: row.owner_profile_type,
    },
    stats: {
      favoriteCount: Number(row.favorite_count),
      likeCount: Number(row.like_count),
    },
    sponsorship: {
      isSponsored: row.is_sponsored,
      label: row.sponsorship_label,
      placement: row.sponsorship_placement,
    },
    images: mapPublicListingImages(row),
  }
}

function mapPublicCatBreedRow(row: PublicCatBreedRow): PublicCatBreed {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
  }
}

function resolvePublicListingQuery(
  query: ListingPublicListQuery
): ResolvedPublicListingQuery {
  const hasDistanceOrigin = query.lat !== undefined && query.lng !== undefined
  const sort: ListingPublicSort =
    query.sort ?? (query.q ? "relevance" : "recent")

  return {
    distanceLat: hasDistanceOrigin ? (query.lat ?? null) : null,
    distanceLng: hasDistanceOrigin ? (query.lng ?? null) : null,
    radiusKm: hasDistanceOrigin
      ? (query.radiusKm ?? defaultPublicListingRadiusKm)
      : null,
    sort,
  }
}

function hasDistanceFallbackIntent(query: ResolvedPublicListingQuery) {
  return (
    query.distanceLat !== null &&
    query.distanceLng !== null &&
    query.radiusKm !== null
  )
}

function hasPublicListingFallbackIntent(query: ListingPublicListQuery) {
  return Boolean(
    query.q ||
    query.breedId ||
    query.municipalityId ||
    query.provinceId ||
    query.regionId ||
    query.sex ||
    query.ageMonthsMin !== undefined ||
    query.ageMonthsMax !== undefined ||
    query.isFree !== undefined ||
    query.contributionCentsMin !== undefined ||
    query.contributionCentsMax !== undefined ||
    query.isVaccinated !== undefined ||
    query.isSterilized !== undefined ||
    query.isDewormed !== undefined ||
    query.hasMicrochip !== undefined ||
    query.hasImages !== undefined ||
    query.lat !== undefined ||
    query.lng !== undefined ||
    query.radiusKm !== undefined
  )
}

function resolveSuggestionReason(
  query: ListingPublicListQuery,
  exactTotal: number,
  exactCount: number
): PublicListingSuggestionReason | null {
  const exactTotalPages = Math.ceil(exactTotal / query.pageSize)

  if (exactTotal === 0 && query.page === 1) {
    return "empty_exact"
  }

  if (exactCount === 0 && query.page > Math.max(exactTotalPages, 1)) {
    return "end_of_results"
  }

  if (
    exactCount > 0 &&
    query.page === Math.max(exactTotalPages, 1) &&
    exactCount < query.pageSize
  ) {
    return "not_enough_results"
  }

  return null
}

function mapListingSharedFields(
  row: EditableListingDraftRow | ListingReviewSubmissionRow | PublicListingRow
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
    ageMonths: resolveListingAgeMonths(row),
    location: mapListingLocation(row),
    contributionCents: row.contribution_cents,
    isFree: row.is_free,
    isVaccinated: row.is_vaccinated,
    isSterilized: row.is_sterilized,
    isDewormed: row.is_dewormed,
    hasMicrochip: row.has_microchip,
    contactRequestsEnabled: row.contact_requests_enabled,
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at),
  }
}

function mapListingContactPhone(
  row: EditableListingDraftRow | ListingReviewSubmissionRow
): ListingDraft["contactPhone"] {
  return {
    mode: row.contact_phone_mode,
    phoneE164: row.contact_phone_e164,
    phoneVerifiedAt: toIsoStringOrNull(row.contact_phone_verified_at),
  }
}

function resolveListingAgeMonths({
  age_months_max,
  age_months_min,
}: {
  age_months_max: number | null
  age_months_min: number | null
}) {
  if (age_months_min === null && age_months_max === null) {
    return null
  }

  if (age_months_min === null) {
    return age_months_max
  }

  if (age_months_max === null) {
    return age_months_min
  }

  return Math.round((age_months_min + age_months_max) / 2)
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
          blurDataUrl: row.cover_blur_data_url,
          sortOrder: row.cover_sort_order ?? 0,
          isCover: row.cover_is_cover ?? true,
        }
      : null,
    preview: mapPublicListingPreviewImages(row.preview_images),
  }
}

function mapPublicListingPreviewImages(value: unknown): PublicListingImage[] {
  const items = Array.isArray(value) ? value : []

  return items
    .map((item) =>
      isPublicListingImagePayload(item)
        ? {
            id: String(item.id),
            objectKeyLarge: readNullableString(item.object_key_large),
            objectKeyThumb: readNullableString(item.object_key_thumb),
            width: readNullableNumber(item.width),
            height: readNullableNumber(item.height),
            blurHash: readNullableString(item.blur_hash),
            blurDataUrl: readNullableString(item.blur_data_url),
            sortOrder: readNumber(item.sort_order),
            isCover: Boolean(item.is_cover),
          }
        : null
    )
    .filter((item): item is PublicListingImage => item !== null)
}

function isPublicListingImagePayload(
  value: unknown
): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function readNullableString(value: unknown) {
  return typeof value === "string" ? value : null
}

function readNullableNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value
  }

  return null
}

function readNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value)

    return Number.isFinite(parsed) ? parsed : 0
  }

  return 0
}

function mapListingLocation(
  row: EditableListingDraftRow | ListingReviewSubmissionRow | PublicListingRow
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
    blurDataUrl: row.blur_data_url,
    sortOrder: row.sort_order,
    isCover: row.is_cover,
    status: row.status,
    rejectionReason: row.rejection_reason,
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at),
  }
}

function mapListingImageListResponse(
  rows: ListingImageRow[]
): ListingImageListResponse {
  const items = rows.map(mapListingImageRow)

  return {
    items,
    meta: {
      total: items.length,
      readyCount: items.filter((image) => image.status === "ready").length,
      pendingCount: items.filter((image) =>
        ["uploaded", "processing"].includes(image.status)
      ).length,
      rejectedCount: items.filter((image) => image.status === "rejected")
        .length,
      coverImageId: items.find((image) => image.isCover)?.id ?? null,
      maxItems: maxListingImages,
    },
  }
}

function hasSameImageSet(images: ListingImage[], imageIds: string[]) {
  if (images.length !== imageIds.length) {
    return false
  }

  const activeIds = new Set(images.map((image) => image.id))

  return imageIds.every((imageId) => activeIds.has(imageId))
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
    blurDataUrl: row.blur_data_url,
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
    draft.is_free &&
    draft.contribution_cents !== null &&
    draft.contribution_cents > 0
  ) {
    issues.push({
      path: ["contributionCents"],
      message: "Free listings cannot require a price.",
    })
  }

  if (
    !draft.is_free &&
    (draft.contribution_cents === null || draft.contribution_cents <= 0)
  ) {
    issues.push({
      path: ["contributionCents"],
      message: "Paid listings require a price.",
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
