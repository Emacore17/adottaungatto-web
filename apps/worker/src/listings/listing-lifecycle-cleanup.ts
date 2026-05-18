import { createDatabase } from "@workspace/db"

type ListingLifecycleCleanupOptions = {
  batchSize?: number
  databaseUrl: string
  staleDraftTtlDays?: number
}

type ListingLifecycleCleanupWithClientOptions = {
  batchSize?: number
  staleDraftTtlDays?: number
}

type DatabaseClient = {
  unsafe: <T = unknown[]>(query: string, parameters?: unknown[]) => Promise<T>
}

type StaleDraftCleanupRow = {
  listing_id: string
}

type PublishedExpiryCleanupRow = {
  listing_id: string
  search_document_deleted: boolean
}

const defaultBatchSize = 100
const defaultStaleDraftTtlDays = 30

export async function cleanupListingLifecycle(
  options: ListingLifecycleCleanupOptions
) {
  const { client } = createDatabase(options.databaseUrl)

  try {
    return await cleanupListingLifecycleWithClient(
      client as unknown as DatabaseClient,
      options
    )
  } finally {
    await client.end()
  }
}

export async function cleanupListingLifecycleWithClient(
  client: DatabaseClient,
  options: ListingLifecycleCleanupWithClientOptions = {}
) {
  const batchSize = options.batchSize ?? defaultBatchSize
  const staleDraftTtlDays =
    options.staleDraftTtlDays ?? defaultStaleDraftTtlDays
  const staleDrafts = await client.unsafe<StaleDraftCleanupRow[]>(
    softDeleteStaleDraftsSql,
    [staleDraftTtlDays, batchSize]
  )
  const expiredPublished =
    await client.unsafe<PublishedExpiryCleanupRow[]>(expirePublishedListingsSql, [
      batchSize,
    ])
  const searchDocumentsDeleted = expiredPublished.filter(
    (row) => row.search_document_deleted
  ).length
  const staleDraftsDeleted = staleDrafts.length
  const publishedExpired = expiredPublished.length

  return {
    job: "cleanup-listing-lifecycle",
    processed: staleDraftsDeleted + publishedExpired,
    publishedExpired,
    searchDocumentsDeleted,
    staleDraftsDeleted,
    status: "ok" as const,
  }
}

const softDeleteStaleDraftsSql = `
  with stale_listings as (
    select id
    from listings
    where moderation_status in ('draft', 'pending_review')
      and lifecycle_status = 'draft'
      and deleted_at is null
      and updated_at < now() - ($1::int * interval '1 day')
    order by updated_at asc, created_at asc, id asc
    limit $2::int
    for update skip locked
  )
  update listings
  set
    lifecycle_status = 'deleted',
    deleted_at = now(),
    updated_at = now()
  where id in (select id from stale_listings)
  returning id::text as listing_id
`

const expirePublishedListingsSql = `
  with expired_listings as (
    select id
    from listings
    where moderation_status = 'approved'
      and lifecycle_status = 'published'
      and deleted_at is null
      and expires_at is not null
      and expires_at <= now()
    order by expires_at asc, updated_at asc, id asc
    limit $1::int
    for update skip locked
  ),
  updated_listings as (
    update listings
    set
      lifecycle_status = 'expired',
      updated_at = now()
    where id in (select id from expired_listings)
    returning id
  ),
  deleted_search_documents as (
    delete from listing_search_documents
    where listing_id in (select id from updated_listings)
    returning listing_id
  )
  select
    updated_listings.id::text as listing_id,
    (deleted_search_documents.listing_id is not null)::boolean
      as search_document_deleted
  from updated_listings
  left join deleted_search_documents
    on deleted_search_documents.listing_id = updated_listings.id
`
