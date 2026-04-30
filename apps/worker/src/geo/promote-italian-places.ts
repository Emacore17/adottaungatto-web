import { createDatabase } from "@workspace/db"

type PromotionCounts = {
  regions: EntityPromotionCounts
  provinces: EntityPromotionCounts
  municipalities: EntityPromotionCounts
}

type EntityPromotionCounts = {
  staged: number
  unchanged: number
  toInsertOrUpdate: number
  toClose: number
  insertedOrUpdated?: number
  closed?: number
}

type PromoteItalianPlacesOptions = {
  databaseUrl: string
  apply: boolean
  importRunId?: string
}

type ImportRunRow = {
  id: string
  status: string
  reference_date: Date | string
  source_checksum: string
}

type CountRow = {
  count: number
}

type PromotionCountRow = {
  staged: number
  unchanged: number
  to_insert_or_update: number
  to_close: number
}

export async function promoteItalianPlacesStaging(
  options: PromoteItalianPlacesOptions
) {
  const { client } = createDatabase(options.databaseUrl)

  try {
    const importRun = await resolveImportRun(client, options.importRunId)

    if (!importRun) {
      return {
        job: "promote-italian-places",
        mode: options.apply ? "apply" : "dry-run",
        status: "not-found",
        database: {
          written: false,
          reason: options.importRunId
            ? `Import run ${options.importRunId} was not found.`
            : "No staged import run was found.",
        },
      }
    }

    const counts = await calculatePromotionCounts(client, importRun.id)

    if (!options.apply) {
      return {
        job: "promote-italian-places",
        mode: "dry-run",
        status: "ok",
        importRunId: importRun.id,
        importRunStatus: importRun.status,
        sourceChecksumSha256: importRun.source_checksum,
        referenceDate: toDateOnly(importRun.reference_date),
        counts,
        database: {
          written: false,
          nextStep: "Run with --apply to promote staged places.",
        },
      }
    }

    const appliedCounts = await applyPromotion(client, importRun.id, counts)

    return {
      job: "promote-italian-places",
      mode: "apply",
      status: "applied",
      importRunId: importRun.id,
      importRunStatus: "applied",
      sourceChecksumSha256: importRun.source_checksum,
      referenceDate: toDateOnly(importRun.reference_date),
      counts: appliedCounts,
      database: {
        written: true,
        promotedTables: ["geo_regions", "geo_provinces", "geo_municipalities"],
      },
    }
  } finally {
    await client.end()
  }
}

async function resolveImportRun(
  client: ReturnType<typeof createDatabase>["client"],
  importRunId?: string
): Promise<ImportRunRow | undefined> {
  if (importRunId) {
    const [run] = await client.unsafe<ImportRunRow[]>(
      `
        select id, status, reference_date, source_checksum
        from geo_import_runs
        where id = $1
      `,
      [importRunId]
    )

    return run
  }

  const [run] = await client.unsafe<ImportRunRow[]>(
    `
      select id, status, reference_date, source_checksum
      from geo_import_runs
      where status in ('staged', 'applied')
      order by reference_date desc, updated_at desc
      limit 1
    `
  )

  return run
}

async function calculatePromotionCounts(
  client: ReturnType<typeof createDatabase>["client"],
  importRunId: string
): Promise<PromotionCounts> {
  const [regions, provinces, municipalities] = await Promise.all([
    calculateRegionCounts(client, importRunId),
    calculateProvinceCounts(client, importRunId),
    calculateMunicipalityCounts(client, importRunId),
  ])

  return { regions, provinces, municipalities }
}

async function calculateRegionCounts(
  client: ReturnType<typeof createDatabase>["client"],
  importRunId: string
): Promise<EntityPromotionCounts> {
  const [row] = await client.unsafe<PromotionCountRow[]>(
    `
      with staged as (
        select *
        from geo_import_staged_regions
        where import_run_id = $1
      ),
      active as (
        select *
        from geo_regions
        where valid_to is null
      )
      select
        (select count(*)::int from staged) as staged,
        (
          select count(*)::int
          from staged s
          join active a on a.istat_code = s.istat_code
          where a.name is not distinct from s.name
            and a.slug is not distinct from s.slug
        ) as unchanged,
        (
          select count(*)::int
          from staged s
          where not exists (
            select 1
            from active a
            where a.istat_code = s.istat_code
              and a.name is not distinct from s.name
              and a.slug is not distinct from s.slug
          )
        ) as to_insert_or_update,
        (
          select count(*)::int
          from active a
          join geo_import_runs r on r.id = $1
          left join staged s on s.istat_code = a.istat_code
          where a.valid_from < r.reference_date
            and (
              s.id is null
              or a.name is distinct from s.name
              or a.slug is distinct from s.slug
            )
        ) as to_close
    `,
    [importRunId]
  )

  return rowToPromotionCounts(row)
}

async function calculateProvinceCounts(
  client: ReturnType<typeof createDatabase>["client"],
  importRunId: string
): Promise<EntityPromotionCounts> {
  const [row] = await client.unsafe<PromotionCountRow[]>(
    `
      with staged as (
        select sp.*, gr.id as current_region_id
        from geo_import_staged_provinces sp
        left join geo_regions gr
          on gr.istat_code = sp.region_istat_code
         and gr.valid_to is null
        where sp.import_run_id = $1
      ),
      active as (
        select gp.*, gr.istat_code as current_region_istat_code
        from geo_provinces gp
        join geo_regions gr on gr.id = gp.region_id
        where gp.valid_to is null
      )
      select
        (select count(*)::int from staged) as staged,
        (
          select count(*)::int
          from staged s
          join active a on a.istat_code = s.istat_code
          where a.region_id is not distinct from s.current_region_id
            and a.vehicle_code is not distinct from s.vehicle_code
            and a.name is not distinct from s.name
            and a.type::text is not distinct from s.type::text
            and a.slug is not distinct from s.slug
        ) as unchanged,
        (
          select count(*)::int
          from staged s
          where not exists (
            select 1
            from active a
            where a.istat_code = s.istat_code
              and a.region_id is not distinct from s.current_region_id
              and a.vehicle_code is not distinct from s.vehicle_code
              and a.name is not distinct from s.name
              and a.type::text is not distinct from s.type::text
              and a.slug is not distinct from s.slug
          )
        ) as to_insert_or_update,
        (
          select count(*)::int
          from active a
          join geo_import_runs r on r.id = $1
          left join staged s on s.istat_code = a.istat_code
          where a.valid_from < r.reference_date
            and (
              s.id is null
              or a.region_id is distinct from s.current_region_id
              or a.vehicle_code is distinct from s.vehicle_code
              or a.name is distinct from s.name
              or a.type::text is distinct from s.type::text
              or a.slug is distinct from s.slug
            )
        ) as to_close
    `,
    [importRunId]
  )

  return rowToPromotionCounts(row)
}

async function calculateMunicipalityCounts(
  client: ReturnType<typeof createDatabase>["client"],
  importRunId: string
): Promise<EntityPromotionCounts> {
  const [row] = await client.unsafe<PromotionCountRow[]>(
    `
      with staged as (
        select
          sm.*,
          gp.id as current_province_id,
          gr.id as current_region_id
        from geo_import_staged_municipalities sm
        left join geo_provinces gp
          on gp.istat_code = sm.province_istat_code
         and gp.valid_to is null
        left join geo_regions gr
          on gr.istat_code = sm.region_istat_code
         and gr.valid_to is null
        where sm.import_run_id = $1
      ),
      active as (
        select gm.*
        from geo_municipalities gm
        where gm.valid_to is null
      )
      select
        (select count(*)::int from staged) as staged,
        (
          select count(*)::int
          from staged s
          join active a on a.istat_code = s.istat_code
          where a.province_id is not distinct from s.current_province_id
            and a.region_id is not distinct from s.current_region_id
            and a.name is not distinct from s.name
            and a.slug is not distinct from s.slug
            and a.name_normalized is not distinct from s.name_normalized
            and a.is_active is true
        ) as unchanged,
        (
          select count(*)::int
          from staged s
          where not exists (
            select 1
            from active a
            where a.istat_code = s.istat_code
              and a.province_id is not distinct from s.current_province_id
              and a.region_id is not distinct from s.current_region_id
              and a.name is not distinct from s.name
              and a.slug is not distinct from s.slug
              and a.name_normalized is not distinct from s.name_normalized
              and a.is_active is true
          )
        ) as to_insert_or_update,
        (
          select count(*)::int
          from active a
          join geo_import_runs r on r.id = $1
          left join staged s on s.istat_code = a.istat_code
          where a.valid_from < r.reference_date
            and (
              s.id is null
              or a.province_id is distinct from s.current_province_id
              or a.region_id is distinct from s.current_region_id
              or a.name is distinct from s.name
              or a.slug is distinct from s.slug
              or a.name_normalized is distinct from s.name_normalized
              or a.is_active is not true
            )
        ) as to_close
    `,
    [importRunId]
  )

  return rowToPromotionCounts(row)
}

async function applyPromotion(
  client: ReturnType<typeof createDatabase>["client"],
  importRunId: string,
  plannedCounts: PromotionCounts
): Promise<PromotionCounts> {
  return client.begin(async (sql) => {
    const closedRegions = await sql`
      update geo_regions active_region
      set valid_to = import_run.reference_date - interval '1 millisecond',
          updated_at = now()
      from geo_import_runs import_run
      where import_run.id = ${importRunId}
        and active_region.valid_to is null
        and active_region.valid_from < import_run.reference_date
        and (
          not exists (
            select 1
            from geo_import_staged_regions staged_region
            where staged_region.import_run_id = import_run.id
              and staged_region.istat_code = active_region.istat_code
          )
          or exists (
            select 1
            from geo_import_staged_regions staged_region
            where staged_region.import_run_id = import_run.id
              and staged_region.istat_code = active_region.istat_code
              and (
                active_region.name is distinct from staged_region.name
                or active_region.slug is distinct from staged_region.slug
              )
          )
        )
      returning active_region.id
    `

    const promotedRegions = await sql`
      insert into geo_regions (
        istat_code,
        name,
        slug,
        valid_from,
        valid_to,
        created_at,
        updated_at
      )
      select
        staged_region.istat_code,
        staged_region.name,
        staged_region.slug,
        import_run.reference_date,
        null,
        now(),
        now()
      from geo_import_staged_regions staged_region
      join geo_import_runs import_run on import_run.id = staged_region.import_run_id
      where staged_region.import_run_id = ${importRunId}
        and not exists (
          select 1
          from geo_regions active_region
          where active_region.valid_to is null
            and active_region.istat_code = staged_region.istat_code
            and active_region.name is not distinct from staged_region.name
            and active_region.slug is not distinct from staged_region.slug
        )
      on conflict (istat_code, valid_from) do update
      set name = excluded.name,
          slug = excluded.slug,
          valid_to = null,
          updated_at = now()
      returning id
    `

    const closedProvinces = await sql`
      with staged as (
        select
          staged_province.*,
          current_region.id as current_region_id
        from geo_import_staged_provinces staged_province
        join geo_regions current_region
          on current_region.istat_code = staged_province.region_istat_code
         and current_region.valid_to is null
        where staged_province.import_run_id = ${importRunId}
      )
      update geo_provinces active_province
      set valid_to = import_run.reference_date - interval '1 millisecond',
          updated_at = now()
      from geo_import_runs import_run
      where import_run.id = ${importRunId}
        and active_province.valid_to is null
        and active_province.valid_from < import_run.reference_date
        and (
          not exists (
            select 1
            from staged
            where staged.istat_code = active_province.istat_code
          )
          or exists (
            select 1
            from staged
            where staged.istat_code = active_province.istat_code
              and (
                active_province.region_id is distinct from staged.current_region_id
                or active_province.vehicle_code is distinct from staged.vehicle_code
                or active_province.name is distinct from staged.name
                or active_province.type::text is distinct from staged.type::text
                or active_province.slug is distinct from staged.slug
              )
          )
        )
      returning active_province.id
    `

    const promotedProvinces = await sql`
      insert into geo_provinces (
        region_id,
        istat_code,
        vehicle_code,
        name,
        type,
        slug,
        valid_from,
        valid_to,
        created_at,
        updated_at
      )
      select
        current_region.id,
        staged_province.istat_code,
        staged_province.vehicle_code,
        staged_province.name,
        staged_province.type,
        staged_province.slug,
        import_run.reference_date,
        null,
        now(),
        now()
      from geo_import_staged_provinces staged_province
      join geo_import_runs import_run on import_run.id = staged_province.import_run_id
      join geo_regions current_region
        on current_region.istat_code = staged_province.region_istat_code
       and current_region.valid_to is null
      where staged_province.import_run_id = ${importRunId}
        and not exists (
          select 1
          from geo_provinces active_province
          where active_province.valid_to is null
            and active_province.istat_code = staged_province.istat_code
            and active_province.region_id is not distinct from current_region.id
            and active_province.vehicle_code is not distinct from staged_province.vehicle_code
            and active_province.name is not distinct from staged_province.name
            and active_province.type::text is not distinct from staged_province.type::text
            and active_province.slug is not distinct from staged_province.slug
        )
      on conflict (istat_code, valid_from) do update
      set region_id = excluded.region_id,
          vehicle_code = excluded.vehicle_code,
          name = excluded.name,
          type = excluded.type,
          slug = excluded.slug,
          valid_to = null,
          updated_at = now()
      returning id
    `

    const closedMunicipalities = await sql`
      with staged as (
        select
          staged_municipality.*,
          current_province.id as current_province_id,
          current_region.id as current_region_id
        from geo_import_staged_municipalities staged_municipality
        join geo_provinces current_province
          on current_province.istat_code = staged_municipality.province_istat_code
         and current_province.valid_to is null
        join geo_regions current_region
          on current_region.istat_code = staged_municipality.region_istat_code
         and current_region.valid_to is null
        where staged_municipality.import_run_id = ${importRunId}
      )
      update geo_municipalities active_municipality
      set valid_to = import_run.reference_date - interval '1 millisecond',
          is_active = false,
          updated_at = now()
      from geo_import_runs import_run
      where import_run.id = ${importRunId}
        and active_municipality.valid_to is null
        and active_municipality.valid_from < import_run.reference_date
        and (
          not exists (
            select 1
            from staged
            where staged.istat_code = active_municipality.istat_code
          )
          or exists (
            select 1
            from staged
            where staged.istat_code = active_municipality.istat_code
              and (
                active_municipality.province_id is distinct from staged.current_province_id
                or active_municipality.region_id is distinct from staged.current_region_id
                or active_municipality.name is distinct from staged.name
                or active_municipality.slug is distinct from staged.slug
                or active_municipality.name_normalized is distinct from staged.name_normalized
                or active_municipality.is_active is not true
              )
          )
        )
      returning active_municipality.id
    `

    const promotedMunicipalities = await sql`
      insert into geo_municipalities (
        province_id,
        region_id,
        istat_code,
        name,
        slug,
        name_normalized,
        valid_from,
        valid_to,
        is_active,
        created_at,
        updated_at
      )
      select
        current_province.id,
        current_region.id,
        staged_municipality.istat_code,
        staged_municipality.name,
        staged_municipality.slug,
        staged_municipality.name_normalized,
        import_run.reference_date,
        null,
        true,
        now(),
        now()
      from geo_import_staged_municipalities staged_municipality
      join geo_import_runs import_run on import_run.id = staged_municipality.import_run_id
      join geo_provinces current_province
        on current_province.istat_code = staged_municipality.province_istat_code
       and current_province.valid_to is null
      join geo_regions current_region
        on current_region.istat_code = staged_municipality.region_istat_code
       and current_region.valid_to is null
      where staged_municipality.import_run_id = ${importRunId}
        and not exists (
          select 1
          from geo_municipalities active_municipality
          where active_municipality.valid_to is null
            and active_municipality.istat_code = staged_municipality.istat_code
            and active_municipality.province_id is not distinct from current_province.id
            and active_municipality.region_id is not distinct from current_region.id
            and active_municipality.name is not distinct from staged_municipality.name
            and active_municipality.slug is not distinct from staged_municipality.slug
            and active_municipality.name_normalized is not distinct from staged_municipality.name_normalized
            and active_municipality.is_active is true
        )
      on conflict (istat_code, valid_from) do update
      set province_id = excluded.province_id,
          region_id = excluded.region_id,
          name = excluded.name,
          slug = excluded.slug,
          name_normalized = excluded.name_normalized,
          valid_to = null,
          is_active = true,
          updated_at = now()
      returning id
    `

    await sql`
      update geo_import_runs
      set status = 'applied',
          finished_at = now(),
          updated_at = now()
      where id = ${importRunId}
    `

    return {
      regions: {
        ...plannedCounts.regions,
        insertedOrUpdated: promotedRegions.length,
        closed: closedRegions.length,
      },
      provinces: {
        ...plannedCounts.provinces,
        insertedOrUpdated: promotedProvinces.length,
        closed: closedProvinces.length,
      },
      municipalities: {
        ...plannedCounts.municipalities,
        insertedOrUpdated: promotedMunicipalities.length,
        closed: closedMunicipalities.length,
      },
    }
  })
}

function rowToPromotionCounts(
  row: PromotionCountRow | undefined
): EntityPromotionCounts {
  return {
    staged: row?.staged ?? 0,
    unchanged: row?.unchanged ?? 0,
    toInsertOrUpdate: row?.to_insert_or_update ?? 0,
    toClose: row?.to_close ?? 0,
  }
}

async function countRows(
  client: ReturnType<typeof createDatabase>["client"],
  query: string,
  params: string[]
): Promise<number> {
  const [row] = await client.unsafe<CountRow[]>(query, params)

  return row?.count ?? 0
}

function toDateOnly(value: Date | string): string {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10)
  }

  return value.slice(0, 10)
}

export async function countPromotedItalianPlaces(databaseUrl: string): Promise<{
  regions: number
  provinces: number
  municipalities: number
}> {
  const { client } = createDatabase(databaseUrl)

  try {
    const [regions, provinces, municipalities] = await Promise.all([
      countRows(
        client,
        "select count(*)::int as count from geo_regions where valid_to is null",
        []
      ),
      countRows(
        client,
        "select count(*)::int as count from geo_provinces where valid_to is null",
        []
      ),
      countRows(
        client,
        "select count(*)::int as count from geo_municipalities where valid_to is null and is_active is true",
        []
      ),
    ])

    return { regions, provinces, municipalities }
  } finally {
    await client.end()
  }
}
