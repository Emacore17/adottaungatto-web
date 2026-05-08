import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"
import { performance } from "node:perf_hooks"

import { createDatabase } from "@workspace/db"

export const DEFAULT_SEARCH_BENCHMARK_SIZE = 10_000
export const MAX_SEARCH_BENCHMARK_SIZE = 1_000_000
export const MIN_SEARCH_BENCHMARK_SIZE = 100
export const DEFAULT_SEARCH_BENCHMARK_OUTPUT_DIR = "benchmark-results/search"

const BENCHMARK_SLUG_PREFIX = "benchmark-search"
const BENCHMARK_OWNER_EMAIL = "benchmark-search@adottaungatto.local"
const BENCHMARK_LIKE_USER_EMAIL_PREFIX = "benchmark-search-like-"
const BENCHMARK_VALID_FROM = "2026-01-01"
const BENCHMARK_MUNICIPALITY_COUNT = 20
const BENCHMARK_LIKE_USER_COUNT = 5

type SqlClient = ReturnType<typeof createDatabase>["client"]

type CountRow = {
  count: number
}

type IdRow = {
  id: string
}

type ExplainRow = Record<string, unknown>

type SyntheticDatasetResult = {
  ownerUserId: string
  requestedListings: number
  deletedListings: number
  insertedListings: number
  insertedReadyImages: number
  ensuredLikeUsers: number
  insertedLikes: number
  durationMs: number
}

type SearchDocumentRefreshResult = {
  refreshedDocuments: number
  durationMs: number
}

type SearchBenchmarkCleanupCounts = {
  listings: number
  likeUsers: number
  ownerUsers: number
  catBreeds: number
  municipalities: number
  provinces: number
  regions: number
}

type BenchmarkQuery = {
  name: string
  description: string
  sql: string
  params: QueryParam[]
}

type QueryParam = string | number | boolean | null

type BenchmarkQueryRun = {
  name: string
  description: string
  durationMs: number
  planningTimeMs?: number
  executionTimeMs?: number
  explain: unknown
}

export type SearchBenchmarkQuerySummary = Omit<BenchmarkQueryRun, "explain"> & {
  explainPath: string
}

export type SearchBenchmarkArtifacts = {
  directory: string
  summaryPath: string
}

export type SearchBenchmarkResult = {
  job: "benchmark-search"
  status: "ok"
  startedAt: string
  finishedAt: string
  mode: "seed-and-run" | "run-only"
  dataset: {
    requestedSize: number
    syntheticListings: number
    refreshedDocuments: number
    ownerUserId: string | null
  }
  timings: {
    seedMs: number
    documentRefreshMs: number
    explainMs: number
    totalMs: number
  }
  queries: SearchBenchmarkQuerySummary[]
  artifacts: SearchBenchmarkArtifacts
}

export type SearchBenchmarkCleanupResult = {
  job: "benchmark-search"
  status: "cleaned"
  durationMs: number
  deleted: SearchBenchmarkCleanupCounts
}

export type SearchBenchmarkOptions = {
  databaseUrl: string
  datasetSize?: number
  explainAnalyze?: boolean
  outputDir?: string
  skipSeed?: boolean
}

export type SearchBenchmarkCliOptions = Omit<
  SearchBenchmarkOptions,
  "databaseUrl"
> & {
  cleanup?: boolean
}

export async function runSearchBenchmark(
  options: SearchBenchmarkOptions
): Promise<SearchBenchmarkResult> {
  const datasetSize = normalizeSearchBenchmarkSize(
    options.datasetSize ?? DEFAULT_SEARCH_BENCHMARK_SIZE
  )
  const outputDir = resolveSearchBenchmarkOutputDir(
    options.outputDir ?? DEFAULT_SEARCH_BENCHMARK_OUTPUT_DIR
  )
  const explainAnalyze = options.explainAnalyze ?? true
  const startedAtDate = new Date()
  const totalStart = performance.now()
  const { client } = createDatabase(options.databaseUrl)

  try {
    const syntheticDataset = options.skipSeed
      ? await countExistingSyntheticDataset(client, datasetSize)
      : await seedSyntheticSearchDataset(client, datasetSize)
    const searchDocuments = await refreshSyntheticSearchDocuments(
      client,
      syntheticDataset.ownerUserId
    )
    const queryRuns = await runBenchmarkQueries(client, explainAnalyze)
    const explainMs = sumDurations(queryRuns)
    const artifacts = await writeBenchmarkArtifacts({
      outputDir,
      startedAt: startedAtDate,
      mode: options.skipSeed ? "run-only" : "seed-and-run",
      datasetSize,
      syntheticDataset,
      searchDocuments,
      queryRuns,
      explainMs,
      totalMs: performance.now() - totalStart,
    })

    const finishedAt = new Date()

    return {
      job: "benchmark-search",
      status: "ok",
      startedAt: startedAtDate.toISOString(),
      finishedAt: finishedAt.toISOString(),
      mode: options.skipSeed ? "run-only" : "seed-and-run",
      dataset: {
        requestedSize: datasetSize,
        syntheticListings: syntheticDataset.insertedListings,
        refreshedDocuments: searchDocuments.refreshedDocuments,
        ownerUserId: syntheticDataset.ownerUserId || null,
      },
      timings: {
        seedMs: roundMs(syntheticDataset.durationMs),
        documentRefreshMs: roundMs(searchDocuments.durationMs),
        explainMs: roundMs(explainMs),
        totalMs: roundMs(performance.now() - totalStart),
      },
      queries: artifacts.queries,
      artifacts: {
        directory: artifacts.directory,
        summaryPath: artifacts.summaryPath,
      },
    }
  } finally {
    await client.end()
  }
}

export function normalizeSearchBenchmarkSize(value: number): number {
  if (!Number.isInteger(value)) {
    throw new Error("Benchmark size must be an integer.")
  }

  if (value < MIN_SEARCH_BENCHMARK_SIZE) {
    throw new Error(
      `Benchmark size must be at least ${MIN_SEARCH_BENCHMARK_SIZE}.`
    )
  }

  if (value > MAX_SEARCH_BENCHMARK_SIZE) {
    throw new Error(
      `Benchmark size must be at most ${MAX_SEARCH_BENCHMARK_SIZE}.`
    )
  }

  return value
}

export function parseSearchBenchmarkCliArgs(
  args: string[]
): SearchBenchmarkCliOptions {
  const size = readNumberFlag(args, "--size")

  return {
    datasetSize:
      size === undefined
        ? DEFAULT_SEARCH_BENCHMARK_SIZE
        : normalizeSearchBenchmarkSize(size),
    explainAnalyze: !args.includes("--no-explain-analyze"),
    outputDir:
      readStringFlag(args, "--output-dir") ??
      DEFAULT_SEARCH_BENCHMARK_OUTPUT_DIR,
    cleanup: args.includes("--cleanup"),
    skipSeed: args.includes("--skip-seed"),
  }
}

export function resolveSearchBenchmarkOutputDir(
  outputDir: string,
  baseDir = process.env.INIT_CWD ?? process.cwd()
): string {
  return path.isAbsolute(outputDir)
    ? outputDir
    : path.resolve(baseDir, outputDir)
}

export async function cleanupSearchBenchmarkData(
  databaseUrl: string
): Promise<SearchBenchmarkCleanupResult> {
  const startedAt = performance.now()
  const { client } = createDatabase(databaseUrl)

  try {
    const ownerUserId = await findSyntheticOwnerUserId(client)
    const listings = ownerUserId
      ? await deleteSyntheticListings(client, ownerUserId)
      : 0
    const likeUsers = await deleteRows(
      client,
      `
        delete from users
        where email_normalized like $1
      `,
      [`${BENCHMARK_LIKE_USER_EMAIL_PREFIX}%@adottaungatto.local`]
    )
    const ownerUsers = await deleteRows(
      client,
      `
        delete from users
        where email_normalized = $1
      `,
      [BENCHMARK_OWNER_EMAIL]
    )
    const catBreeds = await deleteRows(
      client,
      `
        delete from cat_breeds
        where slug like 'benchmark-search-%'
      `,
      []
    )
    const municipalities = await deleteRows(
      client,
      `
        delete from geo_municipalities
        where istat_code like 'BM%'
          and valid_from = $1::timestamptz
      `,
      [BENCHMARK_VALID_FROM]
    )
    const provinces = await deleteRows(
      client,
      `
        delete from geo_provinces
        where istat_code = 'BM001'
          and valid_from = $1::timestamptz
      `,
      [BENCHMARK_VALID_FROM]
    )
    const regions = await deleteRows(
      client,
      `
        delete from geo_regions
        where istat_code = 'BM01'
          and valid_from = $1::timestamptz
      `,
      [BENCHMARK_VALID_FROM]
    )

    return {
      job: "benchmark-search",
      status: "cleaned",
      durationMs: roundMs(performance.now() - startedAt),
      deleted: {
        listings,
        likeUsers,
        ownerUsers,
        catBreeds,
        municipalities,
        provinces,
        regions,
      },
    }
  } finally {
    await client.end()
  }
}

async function seedSyntheticSearchDataset(
  client: SqlClient,
  datasetSize: number
): Promise<SyntheticDatasetResult> {
  const startedAt = performance.now()
  const ownerUserId = await ensureSyntheticReferenceData(client)
  const deletedListings = await deleteSyntheticListings(client, ownerUserId)
  const insertedListings = await insertSyntheticListings(
    client,
    ownerUserId,
    datasetSize
  )
  const insertedReadyImages = await insertSyntheticReadyImages(
    client,
    ownerUserId
  )
  const ensuredLikeUsers = await ensureSyntheticLikeUsers(client)
  const insertedLikes = await insertSyntheticLikes(client, ownerUserId)

  await analyzeSearchBenchmarkTables(client)

  return {
    ownerUserId,
    requestedListings: datasetSize,
    deletedListings,
    insertedListings,
    insertedReadyImages,
    ensuredLikeUsers,
    insertedLikes,
    durationMs: performance.now() - startedAt,
  }
}

async function countExistingSyntheticDataset(
  client: SqlClient,
  requestedListings: number
): Promise<SyntheticDatasetResult> {
  const startedAt = performance.now()
  const ownerUserId = await findSyntheticOwnerUserId(client)

  if (!ownerUserId) {
    return {
      ownerUserId: "",
      requestedListings,
      deletedListings: 0,
      insertedListings: 0,
      insertedReadyImages: 0,
      ensuredLikeUsers: 0,
      insertedLikes: 0,
      durationMs: performance.now() - startedAt,
    }
  }

  const [row] = await client.unsafe<CountRow[]>(
    `
      select count(*)::int as count
      from listings
      where owner_user_id = $1::uuid
        and slug like $2
    `,
    [ownerUserId, `${BENCHMARK_SLUG_PREFIX}-%`]
  )

  return {
    ownerUserId,
    requestedListings,
    deletedListings: 0,
    insertedListings: row?.count ?? 0,
    insertedReadyImages: 0,
    ensuredLikeUsers: 0,
    insertedLikes: 0,
    durationMs: performance.now() - startedAt,
  }
}

async function ensureSyntheticReferenceData(
  client: SqlClient
): Promise<string> {
  const [owner] = await client.unsafe<IdRow[]>(
    `
      insert into users (
        email,
        email_normalized,
        display_name,
        profile_type,
        status,
        email_verified_at,
        phone_verified_at,
        created_at,
        updated_at
      )
      values (
        $1,
        $1,
        'Benchmark Ricerca',
        'association',
        'active',
        now(),
        now(),
        now(),
        now()
      )
      on conflict (email_normalized) do update
      set display_name = excluded.display_name,
          profile_type = excluded.profile_type,
          status = excluded.status,
          email_verified_at = coalesce(users.email_verified_at, now()),
          phone_verified_at = coalesce(users.phone_verified_at, now()),
          deleted_at = null,
          updated_at = now()
      returning id::text as id
    `,
    [BENCHMARK_OWNER_EMAIL]
  )

  await client.unsafe(
    `
      insert into cat_breeds (name, slug, synonyms, is_active, sort_order)
      values
        ('Benchmark Europeo', 'benchmark-search-europeo', '["europeo"]'::jsonb, true, 9001),
        ('Benchmark Siamese', 'benchmark-search-siamese', '["siamese"]'::jsonb, true, 9002),
        ('Benchmark Persiano', 'benchmark-search-persiano', '["persiano"]'::jsonb, true, 9003),
        ('Benchmark Maine Coon', 'benchmark-search-maine-coon', '["maine coon"]'::jsonb, true, 9004),
        ('Benchmark British', 'benchmark-search-british', '["british"]'::jsonb, true, 9005)
      on conflict (slug) do update
      set name = excluded.name,
          synonyms = excluded.synonyms,
          is_active = excluded.is_active,
          sort_order = excluded.sort_order,
          updated_at = now()
    `
  )

  const [region] = await client.unsafe<IdRow[]>(
    `
      insert into geo_regions (
        istat_code,
        name,
        slug,
        centroid,
        valid_from,
        valid_to,
        created_at,
        updated_at
      )
      values (
        'BM01',
        'Benchmark Regione',
        'benchmark-regione',
        ST_SetSRID(ST_MakePoint(12.4964, 41.9028), 4326),
        $1::timestamptz,
        null,
        now(),
        now()
      )
      on conflict (istat_code, valid_from) do update
      set name = excluded.name,
          slug = excluded.slug,
          centroid = excluded.centroid,
          valid_to = null,
          updated_at = now()
      returning id::text as id
    `,
    [BENCHMARK_VALID_FROM]
  )

  if (!region?.id) {
    throw new Error("Unable to create synthetic benchmark region.")
  }

  const [province] = await client.unsafe<IdRow[]>(
    `
      insert into geo_provinces (
        region_id,
        istat_code,
        vehicle_code,
        name,
        type,
        slug,
        centroid,
        valid_from,
        valid_to,
        created_at,
        updated_at
      )
      values (
        $1::uuid,
        'BM001',
        'BM',
        'Benchmark Provincia',
        'province',
        'benchmark-provincia',
        ST_SetSRID(ST_MakePoint(12.4964, 41.9028), 4326),
        $2::timestamptz,
        null,
        now(),
        now()
      )
      on conflict (istat_code, valid_from) do update
      set region_id = excluded.region_id,
          vehicle_code = excluded.vehicle_code,
          name = excluded.name,
          type = excluded.type,
          slug = excluded.slug,
          centroid = excluded.centroid,
          valid_to = null,
          updated_at = now()
      returning id::text as id
    `,
    [region.id, BENCHMARK_VALID_FROM]
  )

  if (!province?.id) {
    throw new Error("Unable to create synthetic benchmark province.")
  }

  await client.unsafe(
    `
      insert into geo_municipalities (
        province_id,
        region_id,
        istat_code,
        name,
        slug,
        name_normalized,
        centroid,
        valid_from,
        valid_to,
        is_active,
        created_at,
        updated_at
      )
      select
        $1::uuid,
        $2::uuid,
        'BM' || lpad(input.number::text, 4, '0'),
        'Benchmark Comune ' || input.number::text,
        'benchmark-comune-' || input.number::text,
        'benchmark comune ' || input.number::text,
        ST_SetSRID(
          ST_MakePoint(
            7.5 + (input.number::float8 * 0.22),
            38.2 + (input.number::float8 * 0.18)
          ),
          4326
        ),
        $3::timestamptz,
        null,
        true,
        now(),
        now()
      from generate_series(1, $4::int) as input(number)
      on conflict (istat_code, valid_from) do update
      set province_id = excluded.province_id,
          region_id = excluded.region_id,
          name = excluded.name,
          slug = excluded.slug,
          name_normalized = excluded.name_normalized,
          centroid = excluded.centroid,
          valid_to = null,
          is_active = true,
          updated_at = now()
    `,
    [province.id, region.id, BENCHMARK_VALID_FROM, BENCHMARK_MUNICIPALITY_COUNT]
  )

  if (!owner?.id) {
    throw new Error("Unable to create synthetic benchmark owner.")
  }

  return owner.id
}

async function findSyntheticOwnerUserId(
  client: SqlClient
): Promise<string | null> {
  const [owner] = await client.unsafe<IdRow[]>(
    `
      select id::text as id
      from users
      where email_normalized = $1
      limit 1
    `,
    [BENCHMARK_OWNER_EMAIL]
  )

  return owner?.id ?? null
}

async function deleteSyntheticListings(
  client: SqlClient,
  ownerUserId: string
): Promise<number> {
  const [row] = await client.unsafe<CountRow[]>(
    `
      with deleted as (
        delete from listings
        where owner_user_id = $1::uuid
          and slug like $2
        returning id
      )
      select count(*)::int as count
      from deleted
    `,
    [ownerUserId, `${BENCHMARK_SLUG_PREFIX}-%`]
  )

  return row?.count ?? 0
}

async function deleteRows(
  client: SqlClient,
  query: string,
  params: QueryParam[]
): Promise<number> {
  const [row] = await client.unsafe<CountRow[]>(
    `
      with deleted as (
        ${query}
        returning 1
      )
      select count(*)::int as count
      from deleted
    `,
    params
  )

  return row?.count ?? 0
}

async function insertSyntheticListings(
  client: SqlClient,
  ownerUserId: string,
  datasetSize: number
): Promise<number> {
  const [row] = await client.unsafe<CountRow[]>(
    `
      with breed_rows as (
        select
          id,
          slug,
          row_number() over (order by sort_order, slug)::int as position,
          count(*) over()::int as total_count
        from cat_breeds
        where slug like 'benchmark-search-%'
      ),
      municipality_rows as (
        select
          id,
          province_id,
          region_id,
          row_number() over (order by istat_code)::int as position,
          count(*) over()::int as total_count
        from geo_municipalities
        where istat_code like 'BM%'
          and valid_to is null
          and is_active = true
      ),
      input_rows as (
        select generate_series(1, $2::int)::int as number
      ),
      prepared as (
        select
          input_rows.number,
          breed.id as breed_id,
          municipality.id as municipality_id,
          municipality.province_id,
          municipality.region_id,
          case input_rows.number % 8
            when 0 then 'siamese'
            when 1 then 'europeo'
            when 2 then 'persiano'
            when 3 then 'maine coon'
            when 4 then 'gattino'
            when 5 then 'adozione urgente'
            when 6 then 'roma'
            else 'milano'
          end as keyword,
          case input_rows.number % 6
            when 0 then 'Roma'
            when 1 then 'Milano'
            when 2 then 'Torino'
            when 3 then 'Napoli'
            when 4 then 'Bologna'
            else 'Palermo'
          end as place_keyword
        from input_rows
        join breed_rows breed
          on breed.position = ((input_rows.number - 1) % breed.total_count) + 1
        join municipality_rows municipality
          on municipality.position =
            ((input_rows.number - 1) % municipality.total_count) + 1
      ),
      inserted as (
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
          moderation_status,
          lifecycle_status,
          published_at,
          expires_at,
          created_at,
          updated_at
        )
        select
          $1::uuid,
          'Benchmark ricerca ' ||
            prepared.keyword ||
            ' ' ||
            prepared.place_keyword ||
            ' #' ||
            lpad(prepared.number::text, 7, '0'),
          $3 || '-' || lpad(prepared.number::text, 7, '0'),
          concat(
            'Annuncio sintetico per benchmark ricerca. ',
            'Parole chiave: ',
            prepared.keyword,
            ', ',
            prepared.place_keyword,
            '. ',
            repeat(
              'Gatto socializzato, adatto a famiglia, con scheda sanitaria e informazioni complete. ',
              (prepared.number % 4) + 1
            )
          ),
          prepared.breed_id,
          case prepared.number % 3
            when 0 then 'female'::listing_sex
            when 1 then 'male'::listing_sex
            else 'unknown'::listing_sex
          end,
          case
            when prepared.number % 5 = 0 then null
            else (prepared.number % 84)::int
          end,
          case
            when prepared.number % 5 = 0 then null
            else ((prepared.number % 84) + 6)::int
          end,
          prepared.municipality_id,
          prepared.province_id,
          prepared.region_id,
          ST_SetSRID(
            ST_MakePoint(
              7.5 + ((prepared.number % 130)::float8 / 10),
              36.5 + ((prepared.number % 110)::float8 / 12)
            ),
            4326
          ),
          case when prepared.number % 9 = 0 then 7500 else null end,
          prepared.number % 9 <> 0,
          prepared.number % 2 = 0,
          prepared.number % 3 = 0,
          prepared.number % 4 = 0,
          prepared.number % 5 = 0,
          'approved',
          'published',
          now() - make_interval(days => (prepared.number % 120)::int),
          now() + interval '90 days',
          now() - make_interval(days => (prepared.number % 120)::int),
          now()
        from prepared
        returning id
      )
      select count(*)::int as count
      from inserted
    `,
    [ownerUserId, datasetSize, BENCHMARK_SLUG_PREFIX]
  )

  return row?.count ?? 0
}

async function insertSyntheticReadyImages(
  client: SqlClient,
  ownerUserId: string
): Promise<number> {
  const [row] = await client.unsafe<CountRow[]>(
    `
      with inserted as (
        insert into listing_images (
          listing_id,
          object_key_original,
          object_key_large,
          object_key_thumb,
          mime_type,
          width,
          height,
          size_bytes,
          checksum,
          sort_order,
          is_cover,
          status,
          created_at,
          updated_at
        )
        select
          listing.id,
          'benchmark/search/' || listing.id::text || '/original/cover.jpg',
          'benchmark/search/' || listing.id::text || '/large/cover.webp',
          'benchmark/search/' || listing.id::text || '/thumb/cover.webp',
          'image/jpeg',
          1200,
          800,
          180000,
          'benchmark-' || listing.id::text,
          0,
          true,
          'ready',
          now(),
          now()
        from listings listing
        where listing.owner_user_id = $1::uuid
          and listing.slug like $2
          and (right(listing.slug, 7)::int % 10) < 7
        on conflict (object_key_original) do nothing
        returning id
      )
      select count(*)::int as count
      from inserted
    `,
    [ownerUserId, `${BENCHMARK_SLUG_PREFIX}-%`]
  )

  return row?.count ?? 0
}

async function ensureSyntheticLikeUsers(client: SqlClient): Promise<number> {
  const [row] = await client.unsafe<CountRow[]>(
    `
      with inserted as (
        insert into users (
          email,
          email_normalized,
          display_name,
          profile_type,
          status,
          email_verified_at,
          created_at,
          updated_at
        )
        select
          $1 || input.number::text || '@adottaungatto.local',
          $1 || input.number::text || '@adottaungatto.local',
          'Benchmark Like ' || input.number::text,
          'private',
          'active',
          now(),
          now(),
          now()
        from generate_series(1, $2::int) as input(number)
        on conflict (email_normalized) do update
        set display_name = excluded.display_name,
            status = excluded.status,
            deleted_at = null,
            updated_at = now()
        returning id
      )
      select count(*)::int as count
      from inserted
    `,
    [BENCHMARK_LIKE_USER_EMAIL_PREFIX, BENCHMARK_LIKE_USER_COUNT]
  )

  return row?.count ?? 0
}

async function insertSyntheticLikes(
  client: SqlClient,
  ownerUserId: string
): Promise<number> {
  const [row] = await client.unsafe<CountRow[]>(
    `
      with liker as (
        select
          id,
          row_number() over (order by email_normalized)::int as position
        from users
        where email_normalized like $3
      ),
      inserted as (
        insert into listing_likes (listing_id, user_id, created_at)
        select
          listing.id,
          liker.id,
          now() - make_interval(days => liker.position)
        from listings listing
        join liker
          on ((right(listing.slug, 7)::int + liker.position) % 7) = 0
        where listing.owner_user_id = $1::uuid
          and listing.slug like $2
        on conflict do nothing
        returning listing_id
      )
      select count(*)::int as count
      from inserted
    `,
    [
      ownerUserId,
      `${BENCHMARK_SLUG_PREFIX}-%`,
      `${BENCHMARK_LIKE_USER_EMAIL_PREFIX}%@adottaungatto.local`,
    ]
  )

  return row?.count ?? 0
}

async function analyzeSearchBenchmarkTables(client: SqlClient): Promise<void> {
  await client.unsafe("analyze listings")
  await client.unsafe("analyze listing_images")
  await client.unsafe("analyze listing_likes")
  await client.unsafe("analyze listing_search_documents")
}

async function refreshSyntheticSearchDocuments(
  client: SqlClient,
  ownerUserId: string
): Promise<SearchDocumentRefreshResult> {
  const startedAt = performance.now()

  if (!ownerUserId) {
    return {
      refreshedDocuments: 0,
      durationMs: performance.now() - startedAt,
    }
  }

  const [row] = await client.unsafe<CountRow[]>(
    `
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
        select
          listing_id,
          bool_or(is_cover) as has_cover_image
        from listing_images
        where status = 'ready'
          and deleted_at is null
        group by listing_id
      ),
      like_counts as (
        select
          listing_id,
          count(*)::int as like_count
        from listing_likes
        group by listing_id
      ),
      refreshed as (
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
          listing.id,
          listing.owner_user_id,
          listing.title,
          listing.description,
          breed.name,
          breed.slug,
          municipality.name,
          province.name,
          region.name,
          concat_ws(
            ' ',
            listing.title,
            breed.name,
            municipality.name,
            province.name,
            region.name,
            listing.description
          ),
          setweight(
            to_tsvector(
              'italian',
              unaccent(concat_ws(' ', listing.title, breed.name))
            ),
            'A'
          ) ||
            setweight(
              to_tsvector(
                'italian',
                unaccent(
                  concat_ws(
                    ' ',
                    municipality.name,
                    province.name,
                    region.name
                  )
                )
              ),
              'B'
            ) ||
            setweight(
              to_tsvector('italian', unaccent(listing.description)),
              'C'
            ),
          listing.location_point,
          coalesce(listing.published_at, listing.updated_at, listing.created_at, now()),
          coalesce(ready_images.ready_image_count, 0),
          coalesce(cover_images.has_cover_image, false),
          coalesce(like_counts.like_count, 0),
          owner.profile_type,
          (
            case when coalesce(ready_images.ready_image_count, 0) > 0 then 30 else 0 end +
            case when coalesce(cover_images.has_cover_image, false) then 20 else 0 end +
            case when length(listing.description) >= 300 then 15 else 0 end +
            case when listing.breed_id is not null then 5 else 0 end +
            case
              when listing.age_months_min is not null
                or listing.age_months_max is not null
              then 10
              else 0
            end +
            case when listing.municipality_id is not null then 10 else 0 end +
            case when listing.is_vaccinated is not null then 3 else 0 end +
            case when listing.is_sterilized is not null then 3 else 0 end +
            case when listing.is_dewormed is not null then 2 else 0 end +
            case when listing.has_microchip is not null then 2 else 0 end
          )::int,
          least(
            100,
            case owner.profile_type
              when 'association' then 70
              when 'shelter' then 70
              when 'professional' then 55
              when 'breeder' then 50
              else 35
            end +
            case when owner.email_verified_at is not null then 10 else 0 end +
            case when owner.phone_verified_at is not null then 10 else 0 end
          )::int,
          now(),
          now()
        from listings listing
        join users owner on owner.id = listing.owner_user_id
        left join cat_breeds breed on breed.id = listing.breed_id
        left join geo_municipalities municipality
          on municipality.id = listing.municipality_id
        left join geo_provinces province on province.id = listing.province_id
        left join geo_regions region on region.id = listing.region_id
        left join ready_images on ready_images.listing_id = listing.id
        left join cover_images on cover_images.listing_id = listing.id
        left join like_counts on like_counts.listing_id = listing.id
        where listing.owner_user_id = $1::uuid
          and listing.slug like $2
          and listing.moderation_status = 'approved'
          and listing.lifecycle_status = 'published'
          and listing.deleted_at is null
          and owner.deleted_at is null
          and (listing.expires_at is null or listing.expires_at > now())
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
      )
      select count(*)::int as count
      from refreshed
    `,
    [ownerUserId, `${BENCHMARK_SLUG_PREFIX}-%`]
  )

  await client.unsafe("analyze listing_search_documents")

  return {
    refreshedDocuments: row?.count ?? 0,
    durationMs: performance.now() - startedAt,
  }
}

async function runBenchmarkQueries(
  client: SqlClient,
  explainAnalyze: boolean
): Promise<BenchmarkQueryRun[]> {
  const runs: BenchmarkQueryRun[] = []

  for (const query of createBenchmarkQueries()) {
    runs.push(await runBenchmarkQuery(client, query, explainAnalyze))
  }

  return runs
}

function createBenchmarkQueries(): BenchmarkQuery[] {
  return [
    {
      name: "recent-public",
      description:
        "Lista pubblica recente senza testo libero, ordinata per pubblicazione.",
      sql: `
        select
          search_document.listing_id,
          search_document.title,
          search_document.published_at,
          search_document.quality_score,
          search_document.trust_score
        from listing_search_documents search_document
        order by search_document.published_at desc, search_document.listing_id
        limit 20
      `,
      params: [],
    },
    {
      name: "full-text-selective",
      description:
        "Ricerca full-text selettiva su documento denormalizzato e ranking postgres-v1.",
      sql: `
        with input as (
          select websearch_to_tsquery('italian', unaccent($1::text)) as query
        )
        select
          search_document.listing_id,
          search_document.title,
          (
            ts_rank_cd(search_document.search_vector, input.query) * 0.45
            + (
              1 / (
                1 + (
                  greatest(
                    0,
                    extract(epoch from (now() - search_document.published_at))
                  ) / 86400 / 30
                )
              )
            ) * 0.15
            + (search_document.quality_score::float8 / 100) * 0.12
            + (search_document.trust_score::float8 / 100) * 0.05
            + least(
              1,
              ln(1 + greatest(search_document.like_count, 0)) / ln(101)
            ) * 0.03
          ) as score
        from listing_search_documents search_document
        cross join input
        where search_document.search_vector @@ input.query
        order by score desc, search_document.published_at desc, search_document.listing_id
        limit 20
      `,
      params: ["siamese roma"],
    },
    {
      name: "combined-filters",
      description:
        "Filtri combinati su razza, immagini pronte e qualita minima.",
      sql: `
        select
          search_document.listing_id,
          search_document.title,
          search_document.ready_image_count,
          search_document.quality_score
        from listing_search_documents search_document
        where search_document.breed_slug in ($1, $2)
          and search_document.ready_image_count > 0
          and search_document.quality_score >= $3::int
        order by search_document.quality_score desc,
          search_document.published_at desc,
          search_document.listing_id
        limit 20
      `,
      params: ["benchmark-search-siamese", "benchmark-search-europeo", 70],
    },
    {
      name: "geo-distance",
      description:
        "Filtro geografico con ST_DWithin e ordinamento per distanza.",
      sql: `
        with origin as (
          select ST_SetSRID(ST_MakePoint($1::float8, $2::float8), 4326) as point
        )
        select
          search_document.listing_id,
          search_document.title,
          ST_Distance(
            search_document.location_point::geography,
            origin.point::geography
          ) as distance_m
        from listing_search_documents search_document
        cross join origin
        where search_document.location_point is not null
          and ST_DWithin(
            search_document.location_point::geography,
            origin.point::geography,
            $3::float8 * 1000
          )
        order by distance_m asc,
          search_document.published_at desc,
          search_document.listing_id
        limit 20
      `,
      params: [12.4964, 41.9028, 400],
    },
  ]
}

async function runBenchmarkQuery(
  client: SqlClient,
  query: BenchmarkQuery,
  explainAnalyze: boolean
): Promise<BenchmarkQueryRun> {
  const startedAt = performance.now()
  const analyzeClause = explainAnalyze ? "analyze, " : ""
  const rows = await client.unsafe<ExplainRow[]>(
    `explain (${analyzeClause}buffers, format json) ${query.sql}`,
    query.params
  )
  const explain = extractExplain(rows[0])
  const explainTimes = extractExplainTimes(explain)

  return {
    name: query.name,
    description: query.description,
    durationMs: roundMs(performance.now() - startedAt),
    ...explainTimes,
    explain,
  }
}

async function writeBenchmarkArtifacts(options: {
  outputDir: string
  startedAt: Date
  mode: "seed-and-run" | "run-only"
  datasetSize: number
  syntheticDataset: SyntheticDatasetResult
  searchDocuments: SearchDocumentRefreshResult
  queryRuns: BenchmarkQueryRun[]
  explainMs: number
  totalMs: number
}): Promise<
  SearchBenchmarkArtifacts & { queries: SearchBenchmarkQuerySummary[] }
> {
  const directory = path.resolve(
    options.outputDir,
    formatBenchmarkRunId(options.startedAt)
  )
  await mkdir(directory, { recursive: true })

  const queries: SearchBenchmarkQuerySummary[] = []

  for (const queryRun of options.queryRuns) {
    const explainPath = path.join(directory, `${queryRun.name}.explain.json`)
    await writeFile(
      explainPath,
      `${JSON.stringify(queryRun.explain, null, 2)}\n`
    )

    queries.push({
      name: queryRun.name,
      description: queryRun.description,
      durationMs: queryRun.durationMs,
      planningTimeMs: queryRun.planningTimeMs,
      executionTimeMs: queryRun.executionTimeMs,
      explainPath,
    })
  }

  const summaryPath = path.join(directory, "summary.json")
  await writeFile(
    summaryPath,
    `${JSON.stringify(
      {
        job: "benchmark-search",
        status: "ok",
        startedAt: options.startedAt.toISOString(),
        mode: options.mode,
        dataset: {
          requestedSize: options.datasetSize,
          syntheticListings: options.syntheticDataset.insertedListings,
          deletedListings: options.syntheticDataset.deletedListings,
          insertedReadyImages: options.syntheticDataset.insertedReadyImages,
          ensuredLikeUsers: options.syntheticDataset.ensuredLikeUsers,
          insertedLikes: options.syntheticDataset.insertedLikes,
          refreshedDocuments: options.searchDocuments.refreshedDocuments,
          ownerUserId: options.syntheticDataset.ownerUserId || null,
        },
        timings: {
          seedMs: roundMs(options.syntheticDataset.durationMs),
          documentRefreshMs: roundMs(options.searchDocuments.durationMs),
          explainMs: roundMs(options.explainMs),
          totalMs: roundMs(options.totalMs),
        },
        queries,
      },
      null,
      2
    )}\n`
  )

  return {
    directory,
    summaryPath,
    queries,
  }
}

function extractExplain(row: ExplainRow | undefined): unknown {
  if (!row) {
    return null
  }

  return Object.values(row)[0] ?? null
}

function extractExplainTimes(explain: unknown): {
  planningTimeMs?: number
  executionTimeMs?: number
} {
  const root = Array.isArray(explain) ? explain[0] : null

  if (!isRecord(root)) {
    return {}
  }

  return {
    planningTimeMs: readNumberProperty(root, "Planning Time"),
    executionTimeMs: readNumberProperty(root, "Execution Time"),
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function readNumberProperty(
  value: Record<string, unknown>,
  property: string
): number | undefined {
  const rawValue = value[property]

  return typeof rawValue === "number" ? roundMs(rawValue) : undefined
}

function sumDurations(queryRuns: BenchmarkQueryRun[]): number {
  return queryRuns.reduce((sum, queryRun) => sum + queryRun.durationMs, 0)
}

function formatBenchmarkRunId(date: Date): string {
  return date.toISOString().replace(/[:.]/g, "-")
}

function roundMs(value: number): number {
  return Math.round(value * 100) / 100
}

function readStringFlag(args: string[], flag: string): string | undefined {
  const equalsPrefix = `${flag}=`
  const equalsArg = args.find((arg) => arg.startsWith(equalsPrefix))

  if (equalsArg) {
    const value = equalsArg.slice(equalsPrefix.length)

    return value.length > 0 ? value : undefined
  }

  const index = args.indexOf(flag)

  if (index === -1) {
    return undefined
  }

  return args[index + 1]
}

function readNumberFlag(args: string[], flag: string): number | undefined {
  const value = readStringFlag(args, flag)

  if (value === undefined) {
    return undefined
  }

  const numberValue = Number(value)

  if (!Number.isFinite(numberValue)) {
    throw new Error(`${flag} must be a number.`)
  }

  return numberValue
}
