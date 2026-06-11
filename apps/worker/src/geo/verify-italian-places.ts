import { createDatabase } from "@workspace/db"

export type ItalianPlacesHealthSnapshot = {
  regions: number
  provinces: number
  municipalities: number
  duplicateActivePlaceGroups: number
}

export type ItalianPlacesMinimums = {
  regions: number
  provinces: number
  municipalities: number
}

export type ItalianPlacesHealthResult = {
  ok: boolean
  errors: string[]
  minimums: ItalianPlacesMinimums
  snapshot: ItalianPlacesHealthSnapshot
}

const defaultItalianPlacesMinimums: ItalianPlacesMinimums = {
  municipalities: 7800,
  provinces: 100,
  regions: 20,
}

type SnapshotRow = {
  regions: number
  provinces: number
  municipalities: number
  duplicate_active_place_groups: number
}

export function evaluateItalianPlacesHealth(
  snapshot: ItalianPlacesHealthSnapshot,
  minimums: ItalianPlacesMinimums = defaultItalianPlacesMinimums
): ItalianPlacesHealthResult {
  const errors: string[] = []

  if (snapshot.regions < minimums.regions) {
    errors.push(
      `Expected at least ${minimums.regions} active regions, found ${snapshot.regions}.`
    )
  }

  if (snapshot.provinces < minimums.provinces) {
    errors.push(
      `Expected at least ${minimums.provinces} active provinces, found ${snapshot.provinces}.`
    )
  }

  if (snapshot.municipalities < minimums.municipalities) {
    errors.push(
      `Expected at least ${minimums.municipalities} active municipalities, found ${snapshot.municipalities}.`
    )
  }

  if (snapshot.duplicateActivePlaceGroups > 0) {
    errors.push(
      `Found ${snapshot.duplicateActivePlaceGroups} duplicate active place groups.`
    )
  }

  return {
    errors,
    minimums,
    ok: errors.length === 0,
    snapshot,
  }
}

export async function verifyItalianPlaces(databaseUrl: string) {
  const snapshot = await readItalianPlacesHealthSnapshot(databaseUrl)

  return evaluateItalianPlacesHealth(snapshot)
}

async function readItalianPlacesHealthSnapshot(
  databaseUrl: string
): Promise<ItalianPlacesHealthSnapshot> {
  const { client } = createDatabase(databaseUrl)

  try {
    const [row] = await client.unsafe<SnapshotRow[]>(`
      with active_regions as (
        select id, istat_code, slug
        from geo_regions
        where valid_to is null
      ),
      active_provinces as (
        select id, region_id, istat_code, vehicle_code, slug
        from geo_provinces
        where valid_to is null
      ),
      active_municipalities as (
        select id, province_id, region_id, istat_code, name_normalized
        from geo_municipalities
        where valid_to is null and is_active is true
      ),
      duplicate_groups as (
        select 'region-istat:' || istat_code as duplicate_key
        from active_regions
        group by istat_code
        having count(*) > 1

        union all

        select 'region-slug:' || slug as duplicate_key
        from active_regions
        group by slug
        having count(*) > 1

        union all

        select 'province-istat:' || istat_code as duplicate_key
        from active_provinces
        group by istat_code
        having count(*) > 1

        union all

        select concat('province-natural:', region_id, '|', coalesce(vehicle_code, ''), '|', slug) as duplicate_key
        from active_provinces
        group by region_id, vehicle_code, slug
        having count(*) > 1

        union all

        select 'municipality-istat:' || istat_code as duplicate_key
        from active_municipalities
        group by istat_code
        having count(*) > 1

        union all

        select concat('municipality-natural:', region_id, '|', province_id, '|', name_normalized) as duplicate_key
        from active_municipalities
        group by region_id, province_id, name_normalized
        having count(*) > 1
      )
      select
        (select count(*)::int from active_regions) as regions,
        (select count(*)::int from active_provinces) as provinces,
        (select count(*)::int from active_municipalities) as municipalities,
        (select count(*)::int from duplicate_groups) as duplicate_active_place_groups
    `)

    return {
      duplicateActivePlaceGroups: row?.duplicate_active_place_groups ?? 0,
      municipalities: row?.municipalities ?? 0,
      provinces: row?.provinces ?? 0,
      regions: row?.regions ?? 0,
    }
  } finally {
    await client.end()
  }
}
