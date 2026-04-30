import { Inject, Injectable } from "@nestjs/common"

import { DatabaseService } from "../database/database.service.js"
import type {
  PlaceAutocompleteItem,
  PlaceAutocompleteRequest,
  PlaceAutocompleteResponse,
  PlaceNearbyItem,
  PlaceNearbyRequest,
  PlaceNearbyResponse,
} from "./places.types.js"

type PlaceRow = {
  type: "municipality" | "province" | "region"
  id: string
  label: string
  subtitle: string
  istat_code: string
  region_id: string | null
  region_name: string | null
  region_istat_code: string | null
  province_id: string | null
  province_name: string | null
  province_istat_code: string | null
  center_lat: number | string | null
  center_lng: number | string | null
}

type PlaceNearbyRow = PlaceRow & {
  distance_meters: number | string
}

const autocompleteSql = `
  with input as (
    select
      $1::text as query,
      $2::int as max_limit,
      $3::text as filter_type
  ),
  municipalities as (
    select
      'municipality'::text as type,
      municipality.id::text as id,
      municipality.name as label,
      concat('Comune, ', region.name) as subtitle,
      municipality.istat_code,
      region.id::text as region_id,
      region.name as region_name,
      region.istat_code as region_istat_code,
      province.id::text as province_id,
      province.name as province_name,
      province.istat_code as province_istat_code,
      case
        when municipality.centroid is null then null
        else ST_Y(municipality.centroid)::float8
      end as center_lat,
      case
        when municipality.centroid is null then null
        else ST_X(municipality.centroid)::float8
      end as center_lng,
      1 as type_rank,
      case
        when municipality.name_normalized = input.query then 0
        when municipality.name_normalized like input.query || '%' then 1
        when municipality.name_normalized like '%' || input.query || '%' then 2
        else 3
      end as match_rank,
      similarity(municipality.name_normalized, input.query) as similarity_score
    from geo_municipalities municipality
    join geo_provinces province on province.id = municipality.province_id
    join geo_regions region on region.id = municipality.region_id
    cross join input
    where municipality.valid_to is null
      and municipality.is_active = true
      and province.valid_to is null
      and region.valid_to is null
      and (input.filter_type is null or input.filter_type = 'municipality')
      and (
        municipality.name_normalized like input.query || '%'
        or municipality.name_normalized like '%' || input.query || '%'
        or similarity(municipality.name_normalized, input.query) > 0.25
      )
  ),
  provinces as (
    select
      'province'::text as type,
      province.id::text as id,
      province.name as label,
      concat(province_label.label, ', ', region.name) as subtitle,
      province.istat_code,
      region.id::text as region_id,
      region.name as region_name,
      region.istat_code as region_istat_code,
      null::text as province_id,
      null::text as province_name,
      null::text as province_istat_code,
      case
        when province.centroid is null then null
        else ST_Y(province.centroid)::float8
      end as center_lat,
      case
        when province.centroid is null then null
        else ST_X(province.centroid)::float8
      end as center_lng,
      2 as type_rank,
      case
        when province_search.searchable_name = input.query then 0
        when province_search.searchable_name like input.query || '%' then 1
        when province_search.searchable_name like '%' || input.query || '%' then 2
        else 3
      end as match_rank,
      similarity(province_search.searchable_name, input.query) as similarity_score
    from geo_provinces province
    join geo_regions region on region.id = province.region_id
    cross join input
    cross join lateral (
      select trim(
        regexp_replace(
          regexp_replace(lower(unaccent(province.name)), '[^a-z0-9]+', ' ', 'g'),
          '[[:space:]]+',
          ' ',
          'g'
        )
      ) as searchable_name
    ) province_search
    cross join lateral (
      select case province.type::text
        when 'metropolitan_city' then 'Citta metropolitana'
        when 'autonomous_province' then 'Provincia autonoma'
        when 'free_municipal_consortium' then 'Libero consorzio'
        when 'non_administrative_unit' then 'Unita territoriale'
        else 'Provincia'
      end as label
    ) province_label
    where province.valid_to is null
      and region.valid_to is null
      and (input.filter_type is null or input.filter_type = 'province')
      and (
        province_search.searchable_name like input.query || '%'
        or province_search.searchable_name like '%' || input.query || '%'
        or similarity(province_search.searchable_name, input.query) > 0.25
      )
  ),
  regions as (
    select
      'region'::text as type,
      region.id::text as id,
      region.name as label,
      'Regione'::text as subtitle,
      region.istat_code,
      null::text as region_id,
      null::text as region_name,
      null::text as region_istat_code,
      null::text as province_id,
      null::text as province_name,
      null::text as province_istat_code,
      case
        when region.centroid is null then null
        else ST_Y(region.centroid)::float8
      end as center_lat,
      case
        when region.centroid is null then null
        else ST_X(region.centroid)::float8
      end as center_lng,
      3 as type_rank,
      case
        when region_search.searchable_name = input.query then 0
        when region_search.searchable_name like input.query || '%' then 1
        when region_search.searchable_name like '%' || input.query || '%' then 2
        else 3
      end as match_rank,
      similarity(region_search.searchable_name, input.query) as similarity_score
    from geo_regions region
    cross join input
    cross join lateral (
      select trim(
        regexp_replace(
          regexp_replace(lower(unaccent(region.name)), '[^a-z0-9]+', ' ', 'g'),
          '[[:space:]]+',
          ' ',
          'g'
        )
      ) as searchable_name
    ) region_search
    where region.valid_to is null
      and (input.filter_type is null or input.filter_type = 'region')
      and (
        region_search.searchable_name like input.query || '%'
        or region_search.searchable_name like '%' || input.query || '%'
        or similarity(region_search.searchable_name, input.query) > 0.25
      )
  )
  select *
  from (
    select * from municipalities
    union all
    select * from provinces
    union all
    select * from regions
  ) matches
  order by match_rank, type_rank, similarity_score desc, label
  limit (select max_limit from input)
`

const nearbySql = `
  with input as (
    select
      ST_SetSRID(ST_MakePoint($1::float8, $2::float8), 4326) as origin,
      ($3::float8 * 1000.0) as radius_meters,
      $4::int as max_limit,
      $5::text as filter_type
  ),
  municipalities as (
    select
      'municipality'::text as type,
      municipality.id::text as id,
      municipality.name as label,
      concat('Comune, ', region.name) as subtitle,
      municipality.istat_code,
      region.id::text as region_id,
      region.name as region_name,
      region.istat_code as region_istat_code,
      province.id::text as province_id,
      province.name as province_name,
      province.istat_code as province_istat_code,
      ST_Y(municipality.centroid)::float8 as center_lat,
      ST_X(municipality.centroid)::float8 as center_lng,
      ST_Distance(
        municipality.centroid::geography,
        input.origin::geography
      )::float8 as distance_meters,
      1 as type_rank
    from geo_municipalities municipality
    join geo_provinces province on province.id = municipality.province_id
    join geo_regions region on region.id = municipality.region_id
    cross join input
    where municipality.valid_to is null
      and municipality.is_active = true
      and municipality.centroid is not null
      and province.valid_to is null
      and region.valid_to is null
      and (input.filter_type is null or input.filter_type = 'municipality')
      and ST_DWithin(
        municipality.centroid::geography,
        input.origin::geography,
        input.radius_meters
      )
  ),
  provinces as (
    select
      'province'::text as type,
      province.id::text as id,
      province.name as label,
      concat(province_label.label, ', ', region.name) as subtitle,
      province.istat_code,
      region.id::text as region_id,
      region.name as region_name,
      region.istat_code as region_istat_code,
      null::text as province_id,
      null::text as province_name,
      null::text as province_istat_code,
      ST_Y(province.centroid)::float8 as center_lat,
      ST_X(province.centroid)::float8 as center_lng,
      ST_Distance(
        province.centroid::geography,
        input.origin::geography
      )::float8 as distance_meters,
      2 as type_rank
    from geo_provinces province
    join geo_regions region on region.id = province.region_id
    cross join input
    cross join lateral (
      select case province.type::text
        when 'metropolitan_city' then 'Citta metropolitana'
        when 'autonomous_province' then 'Provincia autonoma'
        when 'free_municipal_consortium' then 'Libero consorzio'
        when 'non_administrative_unit' then 'Unita territoriale'
        else 'Provincia'
      end as label
    ) province_label
    where province.valid_to is null
      and province.centroid is not null
      and region.valid_to is null
      and (input.filter_type is null or input.filter_type = 'province')
      and ST_DWithin(
        province.centroid::geography,
        input.origin::geography,
        input.radius_meters
      )
  ),
  regions as (
    select
      'region'::text as type,
      region.id::text as id,
      region.name as label,
      'Regione'::text as subtitle,
      region.istat_code,
      null::text as region_id,
      null::text as region_name,
      null::text as region_istat_code,
      null::text as province_id,
      null::text as province_name,
      null::text as province_istat_code,
      ST_Y(region.centroid)::float8 as center_lat,
      ST_X(region.centroid)::float8 as center_lng,
      ST_Distance(
        region.centroid::geography,
        input.origin::geography
      )::float8 as distance_meters,
      3 as type_rank
    from geo_regions region
    cross join input
    where region.valid_to is null
      and region.centroid is not null
      and (input.filter_type is null or input.filter_type = 'region')
      and ST_DWithin(
        region.centroid::geography,
        input.origin::geography,
        input.radius_meters
      )
  )
  select *
  from (
    select * from municipalities
    union all
    select * from provinces
    union all
    select * from regions
  ) matches
  order by distance_meters, type_rank, label
  limit (select max_limit from input)
`

@Injectable()
export class PlacesService {
  constructor(
    @Inject(DatabaseService)
    private readonly databaseService: DatabaseService
  ) {}

  async autocomplete(
    query: PlaceAutocompleteRequest
  ): Promise<PlaceAutocompleteResponse> {
    const normalizedQuery = normalizePlaceQuery(query.q)
    const rows = await this.databaseService.queryRows<PlaceRow>(
      autocompleteSql,
      [normalizedQuery, query.limit, query.type ?? null]
    )

    return {
      items: rows.map(mapAutocompleteRow),
      meta: {
        query: query.q,
        normalizedQuery,
        limit: query.limit,
        type: query.type ?? "all",
      },
    }
  }

  async nearby(query: PlaceNearbyRequest): Promise<PlaceNearbyResponse> {
    const rows = await this.databaseService.queryRows<PlaceNearbyRow>(
      nearbySql,
      [query.lng, query.lat, query.radiusKm, query.limit, query.type ?? null]
    )

    return {
      items: rows.map(mapNearbyRow),
      meta: {
        origin: {
          lat: query.lat,
          lng: query.lng,
        },
        radiusKm: query.radiusKm,
        limit: query.limit,
        type: query.type ?? "all",
      },
    }
  }
}

function mapAutocompleteRow(row: PlaceRow): PlaceAutocompleteItem {
  return {
    type: row.type,
    id: row.id,
    label: row.label,
    subtitle: row.subtitle,
    istatCode: row.istat_code,
    hierarchy: {
      region:
        row.region_id && row.region_name && row.region_istat_code
          ? {
              id: row.region_id,
              name: row.region_name,
              istatCode: row.region_istat_code,
            }
          : undefined,
      province:
        row.province_id && row.province_name && row.province_istat_code
          ? {
              id: row.province_id,
              name: row.province_name,
              istatCode: row.province_istat_code,
            }
          : undefined,
    },
    center: mapCenter(row.center_lat, row.center_lng),
  }
}

function mapNearbyRow(row: PlaceNearbyRow): PlaceNearbyItem {
  return {
    ...mapAutocompleteRow(row),
    distanceKm: Math.round((Number(row.distance_meters) / 1000) * 100) / 100,
  }
}

function mapCenter(
  lat: number | string | null,
  lng: number | string | null
): PlaceAutocompleteItem["center"] {
  if (lat === null || lng === null) {
    return null
  }

  return {
    lat: Number(lat),
    lng: Number(lng),
  }
}

export function normalizePlaceQuery(query: string): string {
  return query
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ")
}
