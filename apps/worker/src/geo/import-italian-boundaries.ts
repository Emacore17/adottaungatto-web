import { createHash } from "node:crypto"

import { createDatabase } from "@workspace/db"
import shp from "shpjs"

type BoundaryEntity = "region" | "province" | "municipality"

type ImportItalianBoundariesOptions = {
  databaseUrl: string
  sourceUrl: string
  apply: boolean
  fetchFn?: typeof fetch
}

type BoundaryRecord = {
  entity: BoundaryEntity
  istatCode: string
  label: string
  geojson: {
    type: string
    coordinates: unknown
  }
}

type BoundaryImportSummary = {
  regions: BoundaryEntitySummary
  provinces: BoundaryEntitySummary
  municipalities: BoundaryEntitySummary
}

type BoundaryEntitySummary = {
  sourceFeatures: number
  activeRows: number
  matchingRows: number
  activeRowsWithoutBoundary: number
  sourceFeaturesWithoutActiveRow: number
  updated?: number
}

type DownloadedBoundarySource = {
  buffer: Buffer
  checksum: string
  bytes: number
  fetchedAt: Date
}

type SummaryRow = {
  entity: BoundaryEntity
  source_features: number
  active_rows: number
  matching_rows: number
  active_rows_without_boundary: number
  source_features_without_active_row: number
}

const sourceName = "istat-confini-amministrativi-2026-generalizzati"

export async function runItalianBoundariesImport(
  options: ImportItalianBoundariesOptions
) {
  const startedAt = new Date()
  const source = await downloadBoundarySource(
    options.sourceUrl,
    options.fetchFn
  )
  const boundaryRecords = await parseBoundarySource(source.buffer)
  const { client } = createDatabase(options.databaseUrl)

  try {
    await loadTemporaryBoundaryRecords(client, boundaryRecords)
    const summary = await calculateSummary(client)

    if (!options.apply) {
      return {
        job: "import-italian-boundaries",
        mode: "dry-run",
        status: "ok",
        source: createSourceSummary(options.sourceUrl, source),
        counts: summary,
        database: {
          written: false,
          nextStep: "Run with --apply to update geom and centroid columns.",
        },
        timings: {
          startedAt: startedAt.toISOString(),
          finishedParsingAt: new Date().toISOString(),
        },
      }
    }

    const updated = await applyBoundaryUpdates(client)
    const updatedSummary = mergeUpdatedCounts(summary, updated)

    return {
      job: "import-italian-boundaries",
      mode: "apply",
      status: "applied",
      source: createSourceSummary(options.sourceUrl, source),
      counts: updatedSummary,
      database: {
        written: true,
        updatedTables: ["geo_regions", "geo_provinces", "geo_municipalities"],
      },
      timings: {
        startedAt: startedAt.toISOString(),
        finishedAt: new Date().toISOString(),
      },
    }
  } finally {
    await client.end()
  }
}

export async function parseBoundarySource(
  buffer: Buffer
): Promise<BoundaryRecord[]> {
  const source = await shp(toArrayBuffer(buffer))
  const collections = Array.isArray(source) ? source : [source]
  const records: BoundaryRecord[] = []

  for (const collection of collections) {
    const entity = inferBoundaryEntity(collection.fileName)

    if (!entity) {
      continue
    }

    for (const feature of collection.features) {
      const istatCode = getFeatureIstatCode(entity, feature.properties)

      if (!istatCode) {
        continue
      }

      records.push({
        entity,
        istatCode,
        label: getFeatureLabel(entity, feature.properties),
        geojson: feature.geometry,
      })
    }
  }

  return records
}

export function inferBoundaryEntity(
  fileName: string | undefined
): BoundaryEntity | undefined {
  if (!fileName) {
    return undefined
  }

  const normalized = fileName.toLowerCase()

  if (normalized.includes("reg01012026")) {
    return "region"
  }

  if (normalized.includes("provcm01012026")) {
    return "province"
  }

  if (normalized.includes("com01012026")) {
    return "municipality"
  }

  return undefined
}

export function getFeatureIstatCode(
  entity: BoundaryEntity,
  properties: Record<string, string | number | null>
): string | undefined {
  if (entity === "region") {
    return padCode(properties.COD_REG, 2)
  }

  if (entity === "province") {
    return padCode(properties.COD_UTS, 3)
  }

  return readProperty(properties.PRO_COM_T) ?? padCode(properties.PRO_COM, 6)
}

function getFeatureLabel(
  entity: BoundaryEntity,
  properties: Record<string, string | number | null>
): string {
  if (entity === "region") {
    return readProperty(properties.DEN_REG) ?? ""
  }

  if (entity === "province") {
    return readProperty(properties.DEN_UTS) ?? ""
  }

  return readProperty(properties.COMUNE) ?? ""
}

async function downloadBoundarySource(
  sourceUrl: string,
  fetchFn: typeof fetch = fetch
): Promise<DownloadedBoundarySource> {
  const response = await fetchFn(sourceUrl)

  if (!response.ok) {
    throw new Error(
      `Failed to download Istat boundaries: ${response.status} ${response.statusText}`
    )
  }

  const buffer = Buffer.from(await response.arrayBuffer())

  return {
    buffer,
    checksum: createHash("sha256").update(buffer).digest("hex"),
    bytes: buffer.byteLength,
    fetchedAt: new Date(),
  }
}

async function loadTemporaryBoundaryRecords(
  client: ReturnType<typeof createDatabase>["client"],
  records: BoundaryRecord[]
) {
  await client.unsafe(`
    create temp table temp_istat_boundaries (
      entity text not null,
      istat_code text not null,
      label text not null,
      geojson jsonb not null
    )
  `)

  for (const chunk of chunkItems(records, 300)) {
    await client.unsafe(
      `
        insert into temp_istat_boundaries (entity, istat_code, label, geojson)
        select entity, istat_code, label, geojson
        from jsonb_to_recordset($1::jsonb) as source(
          entity text,
          istat_code text,
          label text,
          geojson jsonb
        )
      `,
      [
        JSON.stringify(
          chunk.map((record) => ({
            entity: record.entity,
            istat_code: record.istatCode,
            label: record.label,
            geojson: record.geojson,
          }))
        ),
      ]
    )
  }
}

async function calculateSummary(
  client: ReturnType<typeof createDatabase>["client"]
): Promise<BoundaryImportSummary> {
  const rows = await client.unsafe<SummaryRow[]>(`
    with entity_targets as (
      select 'region'::text as entity
      union all select 'province'
      union all select 'municipality'
    ),
    active_rows as (
      select 'region'::text as entity, istat_code
      from geo_regions
      where valid_to is null
      union all
      select 'province'::text as entity, istat_code
      from geo_provinces
      where valid_to is null
      union all
      select 'municipality'::text as entity, istat_code
      from geo_municipalities
      where valid_to is null and is_active = true
    )
    select
      target.entity,
      (
        select count(*)::int
        from temp_istat_boundaries boundary
        where boundary.entity = target.entity
      ) as source_features,
      (
        select count(*)::int
        from active_rows active
        where active.entity = target.entity
      ) as active_rows,
      (
        select count(*)::int
        from active_rows active
        join temp_istat_boundaries boundary
          on boundary.entity = active.entity
         and boundary.istat_code = active.istat_code
        where active.entity = target.entity
      ) as matching_rows,
      (
        select count(*)::int
        from active_rows active
        left join temp_istat_boundaries boundary
          on boundary.entity = active.entity
         and boundary.istat_code = active.istat_code
        where active.entity = target.entity
          and boundary.istat_code is null
      ) as active_rows_without_boundary,
      (
        select count(*)::int
        from temp_istat_boundaries boundary
        left join active_rows active
          on active.entity = boundary.entity
         and active.istat_code = boundary.istat_code
        where boundary.entity = target.entity
          and active.istat_code is null
      ) as source_features_without_active_row
    from entity_targets target
  `)

  return {
    regions: summaryFor(rows, "region"),
    provinces: summaryFor(rows, "province"),
    municipalities: summaryFor(rows, "municipality"),
  }
}

async function applyBoundaryUpdates(
  client: ReturnType<typeof createDatabase>["client"]
): Promise<Record<BoundaryEntity, number>> {
  return client.begin(async (sql) => {
    const regions = await sql`
      with parsed as (
        select
          istat_code,
          ST_Multi(
            ST_CollectionExtract(
              ST_MakeValid(ST_SetSRID(ST_GeomFromGeoJSON(geojson::text), 4326)),
              3
            )
          )::geometry(MultiPolygon, 4326) as geom
        from temp_istat_boundaries
        where entity = 'region'
      )
      update geo_regions target
      set geom = parsed.geom,
          centroid = ST_PointOnSurface(parsed.geom)::geometry(Point, 4326),
          updated_at = now()
      from parsed
      where target.valid_to is null
        and target.istat_code = parsed.istat_code
      returning target.id
    `

    const provinces = await sql`
      with parsed as (
        select
          istat_code,
          ST_Multi(
            ST_CollectionExtract(
              ST_MakeValid(ST_SetSRID(ST_GeomFromGeoJSON(geojson::text), 4326)),
              3
            )
          )::geometry(MultiPolygon, 4326) as geom
        from temp_istat_boundaries
        where entity = 'province'
      )
      update geo_provinces target
      set geom = parsed.geom,
          centroid = ST_PointOnSurface(parsed.geom)::geometry(Point, 4326),
          updated_at = now()
      from parsed
      where target.valid_to is null
        and target.istat_code = parsed.istat_code
      returning target.id
    `

    const municipalities = await sql`
      with parsed as (
        select
          istat_code,
          ST_Multi(
            ST_CollectionExtract(
              ST_MakeValid(ST_SetSRID(ST_GeomFromGeoJSON(geojson::text), 4326)),
              3
            )
          )::geometry(MultiPolygon, 4326) as geom
        from temp_istat_boundaries
        where entity = 'municipality'
      )
      update geo_municipalities target
      set geom = parsed.geom,
          centroid = ST_PointOnSurface(parsed.geom)::geometry(Point, 4326),
          updated_at = now()
      from parsed
      where target.valid_to is null
        and target.is_active = true
        and target.istat_code = parsed.istat_code
      returning target.id
    `

    return {
      region: regions.length,
      province: provinces.length,
      municipality: municipalities.length,
    }
  })
}

function mergeUpdatedCounts(
  summary: BoundaryImportSummary,
  updated: Record<BoundaryEntity, number>
): BoundaryImportSummary {
  return {
    regions: { ...summary.regions, updated: updated.region },
    provinces: { ...summary.provinces, updated: updated.province },
    municipalities: {
      ...summary.municipalities,
      updated: updated.municipality,
    },
  }
}

function summaryFor(
  rows: SummaryRow[],
  entity: BoundaryEntity
): BoundaryEntitySummary {
  const row = rows.find((item) => item.entity === entity)

  return {
    sourceFeatures: row?.source_features ?? 0,
    activeRows: row?.active_rows ?? 0,
    matchingRows: row?.matching_rows ?? 0,
    activeRowsWithoutBoundary: row?.active_rows_without_boundary ?? 0,
    sourceFeaturesWithoutActiveRow:
      row?.source_features_without_active_row ?? 0,
  }
}

function createSourceSummary(
  sourceUrl: string,
  source: DownloadedBoundarySource
) {
  return {
    name: sourceName,
    url: sourceUrl,
    checksumSha256: source.checksum,
    bytes: source.bytes,
    fetchedAt: source.fetchedAt.toISOString(),
  }
}

function toArrayBuffer(buffer: Buffer): ArrayBuffer {
  const arrayBuffer = new ArrayBuffer(buffer.byteLength)
  const view = new Uint8Array(arrayBuffer)

  view.set(buffer)

  return arrayBuffer
}

function readProperty(value: string | number | null | undefined) {
  const normalized = String(value ?? "").trim()

  return normalized.length > 0 && normalized !== "-" ? normalized : undefined
}

function padCode(
  value: string | number | null | undefined,
  length: number
): string | undefined {
  const normalized = readProperty(value)

  if (!normalized) {
    return undefined
  }

  return normalized.padStart(length, "0")
}

function chunkItems<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = []

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size))
  }

  return chunks
}
