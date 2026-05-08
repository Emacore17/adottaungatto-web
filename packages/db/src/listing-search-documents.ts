export type ListingSearchDocumentRefreshRow = {
  listing_id: string
  found: boolean
  indexed: boolean
  deleted: boolean
}

export const refreshListingSearchDocumentSql = `
  with target_listing as (
    select
      listing.id,
      listing.owner_user_id,
      listing.title,
      listing.description,
      listing.breed_id,
      listing.age_months_min,
      listing.age_months_max,
      listing.municipality_id,
      listing.location_point,
      listing.is_vaccinated,
      listing.is_sterilized,
      listing.is_dewormed,
      listing.has_microchip,
      listing.moderation_status,
      listing.lifecycle_status,
      listing.published_at,
      listing.expires_at,
      listing.deleted_at,
      listing.created_at,
      listing.updated_at,
      owner.profile_type,
      owner.email_verified_at,
      owner.phone_verified_at,
      owner.deleted_at as owner_deleted_at,
      breed.name as breed_name,
      breed.slug as breed_slug,
      municipality.name as municipality_name,
      province.name as province_name,
      region.name as region_name
    from listings listing
    join users owner on owner.id = listing.owner_user_id
    left join cat_breeds breed on breed.id = listing.breed_id
    left join geo_municipalities municipality
      on municipality.id = listing.municipality_id
    left join geo_provinces province on province.id = listing.province_id
    left join geo_regions region on region.id = listing.region_id
    where listing.id = $1::uuid
    limit 1
  ),
  public_listing as (
    select *
    from target_listing
    where moderation_status = 'approved'
      and lifecycle_status = 'published'
      and deleted_at is null
      and owner_deleted_at is null
      and (expires_at is null or expires_at > now())
  ),
  ready_images as (
    select count(*)::int as ready_image_count
    from listing_images
    where listing_id = $1::uuid
      and status = 'ready'
      and deleted_at is null
  ),
  cover_images as (
    select coalesce(bool_or(is_cover), false) as has_cover_image
    from listing_images
    where listing_id = $1::uuid
      and status = 'ready'
      and deleted_at is null
  ),
  like_counts as (
    select count(*)::int as like_count
    from listing_likes
    where listing_id = $1::uuid
  ),
  upserted_document as (
    insert into listing_search_documents (
      listing_id,
      owner_user_id,
      title,
      description,
      breed_name,
      breed_slug,
      municipality_name,
      province_name,
      region_name,
      search_text,
      search_vector,
      location_point,
      published_at,
      ready_image_count,
      has_cover_image,
      like_count,
      profile_type,
      quality_score,
      trust_score,
      indexed_at,
      updated_at
    )
    select
      public_listing.id,
      public_listing.owner_user_id,
      public_listing.title,
      public_listing.description,
      public_listing.breed_name,
      public_listing.breed_slug,
      public_listing.municipality_name,
      public_listing.province_name,
      public_listing.region_name,
      concat_ws(
        ' ',
        public_listing.title,
        public_listing.breed_name,
        public_listing.municipality_name,
        public_listing.province_name,
        public_listing.region_name,
        public_listing.description
      ),
      setweight(
        to_tsvector(
          'italian',
          unaccent(concat_ws(' ', public_listing.title, public_listing.breed_name))
        ),
        'A'
      ) ||
        setweight(
          to_tsvector(
            'italian',
            unaccent(
              concat_ws(
                ' ',
                public_listing.municipality_name,
                public_listing.province_name,
                public_listing.region_name
              )
            )
          ),
          'B'
        ) ||
        setweight(
          to_tsvector('italian', unaccent(public_listing.description)),
          'C'
        ),
      public_listing.location_point,
      coalesce(
        public_listing.published_at,
        public_listing.updated_at,
        public_listing.created_at,
        now()
      ),
      coalesce(ready_images.ready_image_count, 0),
      coalesce(cover_images.has_cover_image, false),
      coalesce(like_counts.like_count, 0),
      public_listing.profile_type,
      (
        case when coalesce(ready_images.ready_image_count, 0) > 0 then 30 else 0 end +
        case when coalesce(cover_images.has_cover_image, false) then 20 else 0 end +
        case when length(public_listing.description) >= 300 then 15 else 0 end +
        case when public_listing.breed_id is not null then 5 else 0 end +
        case
          when public_listing.age_months_min is not null
            or public_listing.age_months_max is not null
          then 10
          else 0
        end +
        case when public_listing.municipality_id is not null then 10 else 0 end +
        case when public_listing.is_vaccinated is not null then 3 else 0 end +
        case when public_listing.is_sterilized is not null then 3 else 0 end +
        case when public_listing.is_dewormed is not null then 2 else 0 end +
        case when public_listing.has_microchip is not null then 2 else 0 end
      )::int,
      least(
        100,
        case public_listing.profile_type
          when 'association' then 70
          when 'shelter' then 70
          when 'professional' then 55
          when 'breeder' then 50
          else 35
        end +
        case when public_listing.email_verified_at is not null then 10 else 0 end +
        case when public_listing.phone_verified_at is not null then 10 else 0 end
      )::int,
      now(),
      now()
    from public_listing
    left join ready_images on true
    left join cover_images on true
    left join like_counts on true
    on conflict (listing_id) do update
    set
      owner_user_id = excluded.owner_user_id,
      title = excluded.title,
      description = excluded.description,
      breed_name = excluded.breed_name,
      breed_slug = excluded.breed_slug,
      municipality_name = excluded.municipality_name,
      province_name = excluded.province_name,
      region_name = excluded.region_name,
      search_text = excluded.search_text,
      search_vector = excluded.search_vector,
      location_point = excluded.location_point,
      published_at = excluded.published_at,
      ready_image_count = excluded.ready_image_count,
      has_cover_image = excluded.has_cover_image,
      like_count = excluded.like_count,
      profile_type = excluded.profile_type,
      quality_score = excluded.quality_score,
      trust_score = excluded.trust_score,
      indexed_at = excluded.indexed_at,
      updated_at = excluded.updated_at
    returning listing_id
  ),
  deleted_document as (
    delete from listing_search_documents
    where listing_id = $1::uuid
      and not exists (select 1 from public_listing)
    returning listing_id
  )
  select
    $1::text as listing_id,
    exists (select 1 from target_listing) as found,
    exists (select 1 from upserted_document) as indexed,
    exists (select 1 from deleted_document) as deleted
`
