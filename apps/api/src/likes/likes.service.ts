import { Inject, Injectable, NotFoundException } from "@nestjs/common"

import { DatabaseService } from "../database/database.service.js"
import { ListingSearchDocumentsService } from "../listing-search-documents/listing-search-documents.service.js"
import type {
  ListingLikeCountResponse,
  ListingLikeMutationResponse,
  ListingLikeStateResponse,
} from "./likes.types.js"

type LikeCountRow = {
  listing_id: string
  like_count: number | string
}

type LikeMutationRow = LikeCountRow & {
  changed: boolean
}

type LikeStateRow = LikeCountRow & {
  liked: boolean
}

const publicListingWhereSql = `
  listing.moderation_status = 'approved'
  and listing.lifecycle_status = 'published'
  and listing.deleted_at is null
  and owner.deleted_at is null
  and (listing.expires_at is null or listing.expires_at > now())
`

const publicLikeCountSql = `
  select
    listing.id::text as listing_id,
    count(listing_like.user_id)::int as like_count
  from listings listing
  join users owner on owner.id = listing.owner_user_id
  left join listing_likes listing_like on listing_like.listing_id = listing.id
  where listing.id = $1::uuid
    and ${publicListingWhereSql}
  group by listing.id
  limit 1
`

const userLikeStateSql = `
  select
    listing.id::text as listing_id,
    count(listing_like.user_id)::int as like_count,
    exists (
      select 1
      from listing_likes current_user_like
      where current_user_like.listing_id = listing.id
        and current_user_like.user_id = $1::uuid
    ) as liked
  from listings listing
  join users owner on owner.id = listing.owner_user_id
  left join listing_likes listing_like on listing_like.listing_id = listing.id
  where listing.id = $2::uuid
    and ${publicListingWhereSql}
  group by listing.id
  limit 1
`

const addLikeSql = `
  with target_listing as (
    select listing.id
    from listings listing
    join users owner on owner.id = listing.owner_user_id
    where listing.id = $2::uuid
      and ${publicListingWhereSql}
    limit 1
  ),
  inserted_like as (
    insert into listing_likes (listing_id, user_id)
    select target_listing.id, $1::uuid
    from target_listing
    on conflict (listing_id, user_id) do nothing
    returning listing_id
  )
  select
    target_listing.id::text as listing_id,
    (select count(*)::int from listing_likes where listing_id = target_listing.id) as like_count,
    exists (select 1 from inserted_like) as changed
  from target_listing
`

const removeLikeSql = `
  with target_listing as (
    select id
    from listings
    where id = $2::uuid
    limit 1
  ),
  deleted_like as (
    delete from listing_likes
    where user_id = $1::uuid
      and listing_id = $2::uuid
    returning listing_id
  )
  select
    coalesce(target_listing.id, $2::uuid)::text as listing_id,
    (
      select count(*)::int
      from listing_likes
      where listing_id = $2::uuid
    ) as like_count,
    exists (select 1 from deleted_like) as changed
  from (select 1) seed
  left join target_listing on true
`

@Injectable()
export class LikesService {
  constructor(
    @Inject(DatabaseService)
    private readonly databaseService: DatabaseService,
    @Inject(ListingSearchDocumentsService)
    private readonly listingSearchDocumentsService: ListingSearchDocumentsService
  ) {}

  async publicLikeCount(listingId: string): Promise<ListingLikeCountResponse> {
    const [row] = await this.databaseService.queryRows<LikeCountRow>(
      publicLikeCountSql,
      [listingId]
    )

    if (!row) {
      throw new NotFoundException("Public listing not found.")
    }

    return mapLikeCountRow(row)
  }

  async userLikeState(
    userId: string,
    listingId: string
  ): Promise<ListingLikeStateResponse> {
    const [row] = await this.databaseService.queryRows<LikeStateRow>(
      userLikeStateSql,
      [userId, listingId]
    )

    if (!row) {
      throw new NotFoundException("Public listing not found.")
    }

    return {
      ...mapLikeCountRow(row),
      liked: row.liked,
    }
  }

  async likeListing(
    userId: string,
    listingId: string
  ): Promise<ListingLikeMutationResponse> {
    const [row] = await this.databaseService.queryRows<LikeMutationRow>(
      addLikeSql,
      [userId, listingId]
    )

    if (!row) {
      throw new NotFoundException("Public listing not found.")
    }

    if (row.changed) {
      await this.listingSearchDocumentsService.refreshListing(row.listing_id)
    }

    return {
      ...mapLikeCountRow(row),
      liked: true,
      changed: row.changed,
    }
  }

  async unlikeListing(
    userId: string,
    listingId: string
  ): Promise<ListingLikeMutationResponse> {
    const [row] = await this.databaseService.queryRows<LikeMutationRow>(
      removeLikeSql,
      [userId, listingId]
    )
    if (row?.changed) {
      await this.listingSearchDocumentsService.refreshListing(row.listing_id)
    }

    return {
      ...mapLikeCountRow(
        row ?? {
          listing_id: listingId,
          like_count: 0,
        }
      ),
      liked: false,
      changed: Boolean(row?.changed),
    }
  }
}

function mapLikeCountRow(row: LikeCountRow): ListingLikeCountResponse {
  return {
    listingId: row.listing_id,
    likeCount: Number(row.like_count),
  }
}
