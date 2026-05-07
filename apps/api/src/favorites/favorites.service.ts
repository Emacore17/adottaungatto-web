import { Inject, Injectable, NotFoundException } from "@nestjs/common"
import type { FavoriteListQuery } from "@workspace/validation"

import { DatabaseService } from "../database/database.service.js"
import type {
  FavoriteDeleteResponse,
  FavoriteListingItem,
  FavoriteListResponse,
  FavoriteMutationResponse,
} from "./favorites.types.js"

type FavoriteListingRow = {
  total_count?: number | string
  favorite_created_at: Date | string
  listing_id: string
  listing_title: string
  listing_slug: string
  listing_description: string
  listing_published_at: Date | string | null
  listing_expires_at: Date | string | null
  owner_user_id: string
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

const favoriteListingSelect = `
  listing_favorite.created_at as favorite_created_at,
  listing.id::text as listing_id,
  listing.title as listing_title,
  listing.slug as listing_slug,
  listing.description as listing_description,
  listing.published_at as listing_published_at,
  listing.expires_at as listing_expires_at,
  owner.id::text as owner_user_id,
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
`

const favoriteListingJoins = `
  join listings listing on listing.id = listing_favorite.listing_id
  join users owner on owner.id = listing.owner_user_id
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
      object_key_thumb,
      object_key_large
    from listing_images
    where status = 'ready'
      and deleted_at is null
      and is_cover = true
    order by listing_id, sort_order, created_at
  ) cover_images on cover_images.listing_id = listing.id
`

const publicListingWhereSql = `
  listing.moderation_status = 'approved'
  and listing.lifecycle_status = 'published'
  and listing.deleted_at is null
  and owner.deleted_at is null
  and (listing.expires_at is null or listing.expires_at > now())
`

const listFavoritesSql = `
  select
    count(*) over()::int as total_count,
    ${favoriteListingSelect}
  from listing_favorites listing_favorite
  ${favoriteListingJoins}
  where listing_favorite.user_id = $1::uuid
    and ${publicListingWhereSql}
  order by listing_favorite.created_at desc, listing.id desc
  limit $2::int
  offset $3::int
`

const addFavoriteSql = `
  with target_listing as (
    select listing.id
    from listings listing
    join users owner on owner.id = listing.owner_user_id
    where listing.id = $2::uuid
      and ${publicListingWhereSql}
    limit 1
  ),
  inserted_favorite as (
    insert into listing_favorites (listing_id, user_id)
    select target_listing.id, $1::uuid
    from target_listing
    on conflict (listing_id, user_id) do nothing
    returning listing_id, user_id
  ),
  selected_favorite as (
    select
      listing_favorites.*,
      exists (select 1 from inserted_favorite) as created
    from listing_favorites
    join target_listing on target_listing.id = listing_favorites.listing_id
    where listing_favorites.user_id = $1::uuid
  )
  select
    selected_favorite.created,
    ${favoriteListingSelect}
  from selected_favorite listing_favorite
  ${favoriteListingJoins}
  where ${publicListingWhereSql}
  limit 1
`

const deleteFavoriteSql = `
  delete from listing_favorites
  where user_id = $1::uuid
    and listing_id = $2::uuid
  returning listing_id::text
`

@Injectable()
export class FavoritesService {
  constructor(
    @Inject(DatabaseService)
    private readonly databaseService: DatabaseService
  ) {}

  async listFavorites(
    userId: string,
    query: FavoriteListQuery
  ): Promise<FavoriteListResponse> {
    const rows = await this.databaseService.queryRows<FavoriteListingRow>(
      listFavoritesSql,
      [userId, query.pageSize, (query.page - 1) * query.pageSize]
    )
    const total = rows[0]?.total_count ? Number(rows[0].total_count) : 0

    return {
      items: rows.map(mapFavoriteListingRow),
      meta: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.ceil(total / query.pageSize),
      },
    }
  }

  async addFavorite(
    userId: string,
    listingId: string
  ): Promise<FavoriteMutationResponse> {
    const [row] = await this.databaseService.queryRows<
      FavoriteListingRow & { created: boolean }
    >(addFavoriteSql, [userId, listingId])

    if (!row) {
      throw new NotFoundException("Public listing not found.")
    }

    return {
      favorited: true,
      created: row.created,
      item: mapFavoriteListingRow(row),
    }
  }

  async removeFavorite(
    userId: string,
    listingId: string
  ): Promise<FavoriteDeleteResponse> {
    const rows = await this.databaseService.queryRows<{ listing_id: string }>(
      deleteFavoriteSql,
      [userId, listingId]
    )

    return {
      deleted: rows.length > 0,
    }
  }
}

function mapFavoriteListingRow(row: FavoriteListingRow): FavoriteListingItem {
  return {
    favoritedAt: toIsoString(row.favorite_created_at),
    listing: {
      id: row.listing_id,
      title: row.listing_title,
      slug: row.listing_slug,
      description: row.listing_description,
      publishedAt: toIsoStringOrNull(row.listing_published_at),
      expiresAt: toIsoStringOrNull(row.listing_expires_at),
      owner: {
        id: row.owner_user_id,
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
    },
  }
}

function mapLocation(
  row: FavoriteListingRow
): FavoriteListingItem["listing"]["location"] {
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
