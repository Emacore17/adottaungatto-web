import { randomBytes, scrypt, timingSafeEqual } from "node:crypto"
import { pathToFileURL } from "node:url"
import type postgres from "postgres"

import { createDatabase } from "./client.js"
import { seedDatabase } from "./seed.js"

const defaultDatabaseUrl =
  "postgresql://adottaungatto:adottaungatto@localhost:5432/adottaungatto"

const demoPassword = "demo-password-123"

const demoUserIds = [
  "11111111-1111-4111-8111-111111111111",
  "11111111-1111-4111-8111-111111111112",
  "11111111-1111-4111-8111-111111111113",
] as const

const demoListingIds = [
  "44444444-4444-4444-8444-444444444401",
  "44444444-4444-4444-8444-444444444402",
  "44444444-4444-4444-8444-444444444403",
  "44444444-4444-4444-8444-444444444404",
  "44444444-4444-4444-8444-444444444405",
  "44444444-4444-4444-8444-444444444406",
  "44444444-4444-4444-8444-444444444407",
  "44444444-4444-4444-8444-444444444408",
] as const

const demoRegionIds = [
  "22222222-2222-4222-8222-222222222201",
  "22222222-2222-4222-8222-222222222202",
  "22222222-2222-4222-8222-222222222203",
  "22222222-2222-4222-8222-222222222204",
  "22222222-2222-4222-8222-222222222205",
] as const

const demoProvinceIds = [
  "33333333-3333-4333-8333-333333333301",
  "33333333-3333-4333-8333-333333333302",
  "33333333-3333-4333-8333-333333333303",
  "33333333-3333-4333-8333-333333333304",
  "33333333-3333-4333-8333-333333333305",
  "33333333-3333-4333-8333-333333333306",
] as const

const demoMunicipalityIds = [
  "55555555-5555-4555-8555-555555555501",
  "55555555-5555-4555-8555-555555555502",
  "55555555-5555-4555-8555-555555555503",
  "55555555-5555-4555-8555-555555555504",
  "55555555-5555-4555-8555-555555555505",
  "55555555-5555-4555-8555-555555555506",
] as const

const scryptOptions = {
  N: 16384,
  maxmem: 64 * 1024 * 1024,
  p: 1,
  r: 8,
}

export type DemoSeedSummary = {
  dryRun: boolean
  users: number
  regions: number
  provinces: number
  municipalities: number
  listings: number
  password: string
}

export async function seedDemoDatabase(
  databaseUrl = process.env.DATABASE_URL ?? defaultDatabaseUrl,
  options: { dryRun?: boolean } = {}
): Promise<DemoSeedSummary> {
  const summary = {
    dryRun: options.dryRun ?? false,
    listings: demoListingIds.length,
    municipalities: demoMunicipalityIds.length,
    password: demoPassword,
    provinces: demoProvinceIds.length,
    regions: demoRegionIds.length,
    users: demoUserIds.length,
  }

  if (summary.dryRun) {
    return summary
  }

  await seedDatabase(databaseUrl)

  const passwordHash = await hashPassword(demoPassword)
  const { client } = createDatabase(databaseUrl)

  try {
    await client.begin(async (transaction) => {
      await executeSqlBlock(transaction, clearDemoSql)
      await executeSqlBlock(transaction, seedPlacesSql)
      await executeSqlBlock(transaction, seedUsersSql, [passwordHash])
      await executeSqlBlock(transaction, seedListingsSql)
      await executeSqlBlock(transaction, seedListingImagesSql)
      await executeSqlBlock(transaction, seedListingLikesSql)
      await executeSqlBlock(transaction, seedSearchDocumentsSql)
    })
  } finally {
    await client.end()
  }

  return summary
}

const clearDemoSql = `
  delete from listing_likes
  where listing_id in (${quotedList(demoListingIds)})
    or user_id in (${quotedList(demoUserIds)});

  delete from listing_favorites
  where listing_id in (${quotedList(demoListingIds)})
    or user_id in (${quotedList(demoUserIds)});

  delete from listings
  where id in (${quotedList(demoListingIds)})
    or owner_user_id in (${quotedList(demoUserIds)});

  delete from user_roles
  where user_id in (${quotedList(demoUserIds)});

  delete from user_notification_preferences
  where user_id in (${quotedList(demoUserIds)});

  delete from sessions
  where user_id in (${quotedList(demoUserIds)});

  delete from email_verification_tokens
  where user_id in (${quotedList(demoUserIds)});

  delete from password_reset_tokens
  where user_id in (${quotedList(demoUserIds)});

  delete from users
  where id in (${quotedList(demoUserIds)})
    or email_normalized like '%@demo.adottaungatto.local';

  delete from geo_municipalities
  where id in (${quotedList(demoMunicipalityIds)});

  delete from geo_provinces
  where id in (${quotedList(demoProvinceIds)});

  delete from geo_regions
  where id in (${quotedList(demoRegionIds)});
`

const seedPlacesSql = `
  insert into geo_regions (id, istat_code, name, slug, centroid, valid_from)
  values
    ('22222222-2222-4222-8222-222222222201', 'DEMO-PIE', 'Piemonte', 'piemonte', ST_SetSRID(ST_MakePoint(7.6869, 45.0703), 4326), '2026-01-01'),
    ('22222222-2222-4222-8222-222222222202', 'DEMO-LAZ', 'Lazio', 'lazio', ST_SetSRID(ST_MakePoint(12.4964, 41.9028), 4326), '2026-01-01'),
    ('22222222-2222-4222-8222-222222222203', 'DEMO-LOM', 'Lombardia', 'lombardia', ST_SetSRID(ST_MakePoint(9.19, 45.4642), 4326), '2026-01-01'),
    ('22222222-2222-4222-8222-222222222204', 'DEMO-TOS', 'Toscana', 'toscana', ST_SetSRID(ST_MakePoint(11.2558, 43.7696), 4326), '2026-01-01'),
    ('22222222-2222-4222-8222-222222222205', 'DEMO-EMR', 'Emilia-Romagna', 'emilia-romagna', ST_SetSRID(ST_MakePoint(11.3426, 44.4949), 4326), '2026-01-01');

  insert into geo_provinces (id, region_id, istat_code, vehicle_code, name, type, slug, centroid, valid_from)
  values
    ('33333333-3333-4333-8333-333333333301', '22222222-2222-4222-8222-222222222201', 'DEMO-TO', 'TO', 'Torino', 'metropolitan_city', 'torino', ST_SetSRID(ST_MakePoint(7.6869, 45.0703), 4326), '2026-01-01'),
    ('33333333-3333-4333-8333-333333333302', '22222222-2222-4222-8222-222222222202', 'DEMO-RM', 'RM', 'Roma', 'metropolitan_city', 'roma', ST_SetSRID(ST_MakePoint(12.4964, 41.9028), 4326), '2026-01-01'),
    ('33333333-3333-4333-8333-333333333303', '22222222-2222-4222-8222-222222222203', 'DEMO-MI', 'MI', 'Milano', 'metropolitan_city', 'milano', ST_SetSRID(ST_MakePoint(9.19, 45.4642), 4326), '2026-01-01'),
    ('33333333-3333-4333-8333-333333333304', '22222222-2222-4222-8222-222222222204', 'DEMO-FI', 'FI', 'Firenze', 'metropolitan_city', 'firenze', ST_SetSRID(ST_MakePoint(11.2558, 43.7696), 4326), '2026-01-01'),
    ('33333333-3333-4333-8333-333333333305', '22222222-2222-4222-8222-222222222205', 'DEMO-BO', 'BO', 'Bologna', 'metropolitan_city', 'bologna', ST_SetSRID(ST_MakePoint(11.3426, 44.4949), 4326), '2026-01-01'),
    ('33333333-3333-4333-8333-333333333306', '22222222-2222-4222-8222-222222222201', 'DEMO-CN', 'CN', 'Cuneo', 'province', 'cuneo', ST_SetSRID(ST_MakePoint(7.5512, 44.3845), 4326), '2026-01-01');

  insert into geo_municipalities (id, province_id, region_id, istat_code, name, slug, name_normalized, centroid, valid_from, is_active)
  values
    ('55555555-5555-4555-8555-555555555501', '33333333-3333-4333-8333-333333333301', '22222222-2222-4222-8222-222222222201', 'DEMO-TORINO', 'Torino', 'torino', 'torino', ST_SetSRID(ST_MakePoint(7.6869, 45.0703), 4326), '2026-01-01', true),
    ('55555555-5555-4555-8555-555555555502', '33333333-3333-4333-8333-333333333302', '22222222-2222-4222-8222-222222222202', 'DEMO-ROMA', 'Roma', 'roma', 'roma', ST_SetSRID(ST_MakePoint(12.4964, 41.9028), 4326), '2026-01-01', true),
    ('55555555-5555-4555-8555-555555555503', '33333333-3333-4333-8333-333333333303', '22222222-2222-4222-8222-222222222203', 'DEMO-MILANO', 'Milano', 'milano', 'milano', ST_SetSRID(ST_MakePoint(9.19, 45.4642), 4326), '2026-01-01', true),
    ('55555555-5555-4555-8555-555555555504', '33333333-3333-4333-8333-333333333304', '22222222-2222-4222-8222-222222222204', 'DEMO-FIRENZE', 'Firenze', 'firenze', 'firenze', ST_SetSRID(ST_MakePoint(11.2558, 43.7696), 4326), '2026-01-01', true),
    ('55555555-5555-4555-8555-555555555505', '33333333-3333-4333-8333-333333333305', '22222222-2222-4222-8222-222222222205', 'DEMO-BOLOGNA', 'Bologna', 'bologna', 'bologna', ST_SetSRID(ST_MakePoint(11.3426, 44.4949), 4326), '2026-01-01', true),
    ('55555555-5555-4555-8555-555555555506', '33333333-3333-4333-8333-333333333306', '22222222-2222-4222-8222-222222222201', 'DEMO-CUNEO', 'Cuneo', 'cuneo', 'cuneo', ST_SetSRID(ST_MakePoint(7.5512, 44.3845), 4326), '2026-01-01', true);
`

const seedUsersSql = `
  insert into users (
    id,
    email,
    email_normalized,
    password_hash,
    email_verified_at,
    display_name,
    profile_type,
    status
  )
  values
    ('11111111-1111-4111-8111-111111111111', 'rifugio.torino@demo.adottaungatto.local', 'rifugio.torino@demo.adottaungatto.local', $1, now(), 'Rifugio Torino Demo', 'shelter', 'active'),
    ('11111111-1111-4111-8111-111111111112', 'volontari.italia@demo.adottaungatto.local', 'volontari.italia@demo.adottaungatto.local', $1, now(), 'Volontari Italia Demo', 'association', 'active'),
    ('11111111-1111-4111-8111-111111111113', 'marta.demo@demo.adottaungatto.local', 'marta.demo@demo.adottaungatto.local', $1, now(), 'Marta Demo', 'private', 'active');

  insert into user_roles (user_id, role_id)
  select demo_users.id, roles.id
  from (values
    ('11111111-1111-4111-8111-111111111111'::uuid, 'professional_user'),
    ('11111111-1111-4111-8111-111111111112'::uuid, 'professional_user'),
    ('11111111-1111-4111-8111-111111111113'::uuid, 'registered_user')
  ) demo_users(id, role_code)
  join roles on roles.code = demo_users.role_code
  on conflict do nothing;

  insert into user_notification_preferences (user_id)
  select id
  from users
  where id in (${quotedList(demoUserIds)})
  on conflict (user_id) do nothing;
`

const seedListingsSql = `
  insert into listings (
    id,
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
    expires_at
  )
  values
    ('44444444-4444-4444-8444-444444444401', '11111111-1111-4111-8111-111111111111', 'Luna, siamese dolce a Torino', 'luna-siamese-torino', 'Luna e una cucciola siamese abituata alla casa. Cerca una famiglia tranquilla, ama il gioco e convive bene con altri gatti.', (select id from cat_breeds where slug = 'siamese'), 'female', 5, 7, '55555555-5555-4555-8555-555555555501', '33333333-3333-4333-8333-333333333301', '22222222-2222-4222-8222-222222222201', ST_SetSRID(ST_MakePoint(7.6869, 45.0703), 4326), null, true, true, false, true, true, 'approved', 'published', now() - interval '2 days', now() + interval '60 days'),
    ('44444444-4444-4444-8444-444444444402', '11111111-1111-4111-8111-111111111112', 'Miro, europeo affettuoso a Roma', 'miro-europeo-roma', 'Miro e un gatto europeo giovane, socievole e curioso. Ideale per chi cerca un compagno presente e gia abituato alla lettiera.', (select id from cat_breeds where slug = 'europeo'), 'male', 14, 18, '55555555-5555-4555-8555-555555555502', '33333333-3333-4333-8333-333333333302', '22222222-2222-4222-8222-222222222202', ST_SetSRID(ST_MakePoint(12.4964, 41.9028), 4326), null, true, true, true, true, true, 'approved', 'published', now() - interval '4 days', now() + interval '60 days'),
    ('44444444-4444-4444-8444-444444444403', '11111111-1111-4111-8111-111111111112', 'Nebbia, persiano adulto a Milano', 'nebbia-persiano-milano', 'Nebbia e un persiano adulto dal carattere calmo. Ha bisogno di spazzolature regolari e di una casa senza troppa confusione.', (select id from cat_breeds where slug = 'persiano'), 'male', 72, 84, '55555555-5555-4555-8555-555555555503', '33333333-3333-4333-8333-333333333303', '22222222-2222-4222-8222-222222222203', ST_SetSRID(ST_MakePoint(9.19, 45.4642), 4326), 8000, false, true, true, true, true, 'approved', 'published', now() - interval '8 days', now() + interval '60 days'),
    ('44444444-4444-4444-8444-444444444404', '11111111-1111-4111-8111-111111111111', 'Pepe, maine coon giovane a Bologna', 'pepe-maine-coon-bologna', 'Pepe e un maine coon giovane e molto comunicativo. Cerca spazio, finestre sicure e persone presenti durante la giornata.', (select id from cat_breeds where slug = 'maine-coon'), 'male', 20, 24, '55555555-5555-4555-8555-555555555505', '33333333-3333-4333-8333-333333333305', '22222222-2222-4222-8222-222222222205', ST_SetSRID(ST_MakePoint(11.3426, 44.4949), 4326), null, true, true, false, true, false, 'approved', 'published', now() - interval '11 days', now() + interval '60 days'),
    ('44444444-4444-4444-8444-444444444405', '11111111-1111-4111-8111-111111111112', 'Nina, gattina europea a Firenze', 'nina-europea-firenze', 'Nina e una gattina europea vivace e affettuosa. Si affida dopo colloquio conoscitivo e messa in sicurezza degli spazi.', (select id from cat_breeds where slug = 'europeo'), 'female', 3, 4, '55555555-5555-4555-8555-555555555504', '33333333-3333-4333-8333-333333333304', '22222222-2222-4222-8222-222222222204', ST_SetSRID(ST_MakePoint(11.2558, 43.7696), 4326), null, true, false, false, true, false, 'approved', 'published', now() - interval '1 day', now() + interval '60 days'),
    ('44444444-4444-4444-8444-444444444406', '11111111-1111-4111-8111-111111111111', 'Artu, siberiano tranquillo a Cuneo', 'artu-siberiano-cuneo', 'Artu e un siberiano adulto, equilibrato e indipendente. Valutiamo adozione in appartamento con balconi protetti.', (select id from cat_breeds where slug = 'siberiano'), 'male', 48, 60, '55555555-5555-4555-8555-555555555506', '33333333-3333-4333-8333-333333333306', '22222222-2222-4222-8222-222222222201', ST_SetSRID(ST_MakePoint(7.5512, 44.3845), 4326), 5000, false, true, true, true, true, 'approved', 'published', now() - interval '14 days', now() + interval '60 days'),
    ('44444444-4444-4444-8444-444444444407', '11111111-1111-4111-8111-111111111112', 'Sole, cucciola rossa a Torino', 'sole-cucciola-rossa-torino', 'Sole e una cucciola rossa trovata in stallo. E giocosa, mangia autonomamente e cerca una famiglia con tempo da dedicarle.', (select id from cat_breeds where slug = 'europeo'), 'female', 2, 3, '55555555-5555-4555-8555-555555555501', '33333333-3333-4333-8333-333333333301', '22222222-2222-4222-8222-222222222201', ST_SetSRID(ST_MakePoint(7.6869, 45.0703), 4326), null, true, false, false, true, false, 'approved', 'published', now() - interval '6 hours', now() + interval '60 days'),
    ('44444444-4444-4444-8444-444444444408', '11111111-1111-4111-8111-111111111111', 'Oliva, certosina riservata a Roma', 'oliva-certosina-roma', 'Oliva e una gatta certosina riservata ma dolce. Cerca una casa senza cani e con persone pazienti nei primi giorni.', (select id from cat_breeds where slug = 'certosino'), 'female', 36, 42, '55555555-5555-4555-8555-555555555502', '33333333-3333-4333-8333-333333333302', '22222222-2222-4222-8222-222222222202', ST_SetSRID(ST_MakePoint(12.4964, 41.9028), 4326), null, true, true, true, true, true, 'approved', 'published', now() - interval '18 days', now() + interval '60 days');
`

const seedListingImagesSql = `
  insert into listing_images (
    id,
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
    status
  )
  values
    ('66666666-6666-4666-8666-666666666601', '44444444-4444-4444-8444-444444444401', 'demo/listings/luna.png', 'demo/listings/luna-large.png', 'demo/listings/luna-thumb.png', 'image/png', 1200, 900, 2048, 'demo-luna', 10, true, 'ready'),
    ('66666666-6666-4666-8666-666666666602', '44444444-4444-4444-8444-444444444402', 'demo/listings/miro.png', 'demo/listings/miro-large.png', 'demo/listings/miro-thumb.png', 'image/png', 1200, 900, 2048, 'demo-miro', 10, true, 'ready'),
    ('66666666-6666-4666-8666-666666666603', '44444444-4444-4444-8444-444444444403', 'demo/listings/nebbia.png', 'demo/listings/nebbia-large.png', 'demo/listings/nebbia-thumb.png', 'image/png', 1200, 900, 2048, 'demo-nebbia', 10, true, 'ready'),
    ('66666666-6666-4666-8666-666666666604', '44444444-4444-4444-8444-444444444404', 'demo/listings/pepe.png', 'demo/listings/pepe-large.png', 'demo/listings/pepe-thumb.png', 'image/png', 1200, 900, 2048, 'demo-pepe', 10, true, 'ready'),
    ('66666666-6666-4666-8666-666666666605', '44444444-4444-4444-8444-444444444405', 'demo/listings/nina.png', 'demo/listings/nina-large.png', 'demo/listings/nina-thumb.png', 'image/png', 1200, 900, 2048, 'demo-nina', 10, true, 'ready');
`

const seedListingLikesSql = `
  insert into listing_likes (listing_id, user_id)
  values
    ('44444444-4444-4444-8444-444444444401', '11111111-1111-4111-8111-111111111113'),
    ('44444444-4444-4444-8444-444444444402', '11111111-1111-4111-8111-111111111113'),
    ('44444444-4444-4444-8444-444444444405', '11111111-1111-4111-8111-111111111113'),
    ('44444444-4444-4444-8444-444444444407', '11111111-1111-4111-8111-111111111113')
  on conflict do nothing;
`

const seedSearchDocumentsSql = `
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
    indexed_at
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
    concat_ws(' ', listing.title, coalesce(breed.name, ''), municipality.name, province.name, region.name, listing.description),
    setweight(to_tsvector('italian', unaccent(concat_ws(' ', listing.title, coalesce(breed.name, '')))), 'A') ||
      setweight(to_tsvector('italian', unaccent(concat_ws(' ', municipality.name, province.name, region.name))), 'B') ||
      setweight(to_tsvector('italian', unaccent(listing.description)), 'C'),
    listing.location_point,
    listing.published_at,
    coalesce(image_counts.ready_image_count, 0),
    coalesce(image_counts.has_cover_image, false),
    coalesce(like_counts.like_count, 0),
    owner.profile_type,
    case when coalesce(image_counts.ready_image_count, 0) > 0 then 86 else 72 end,
    case owner.profile_type when 'shelter' then 88 when 'association' then 84 else 68 end,
    now()
  from listings listing
  join users owner on owner.id = listing.owner_user_id
  left join cat_breeds breed on breed.id = listing.breed_id
  left join geo_municipalities municipality on municipality.id = listing.municipality_id
  left join geo_provinces province on province.id = listing.province_id
  left join geo_regions region on region.id = listing.region_id
  left join (
    select
      listing_id,
      count(*)::int as ready_image_count,
      bool_or(is_cover)::boolean as has_cover_image
    from listing_images
    where status = 'ready'
      and deleted_at is null
    group by listing_id
  ) image_counts on image_counts.listing_id = listing.id
  left join (
    select listing_id, count(*)::int as like_count
    from listing_likes
    group by listing_id
  ) like_counts on like_counts.listing_id = listing.id
  where listing.id in (${quotedList(demoListingIds)})
  on conflict (listing_id) do update
  set
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
    indexed_at = now(),
    updated_at = now();
`

function quotedList(values: readonly string[]) {
  return values.map((value) => `'${value}'`).join(", ")
}

async function executeSqlBlock(
  transaction: postgres.TransactionSql,
  sql: string,
  parameters: string[] = []
) {
  for (const statement of splitSqlStatements(sql)) {
    await transaction.unsafe(
      statement,
      statement.includes("$") ? parameters : undefined
    )
  }
}

function splitSqlStatements(sql: string) {
  return sql
    .split(";")
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0)
}

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16)
  const key = await deriveScryptKey(password, salt, 64, scryptOptions)

  return [
    "scrypt",
    `N=${scryptOptions.N},r=${scryptOptions.r},p=${scryptOptions.p}`,
    salt.toString("base64url"),
    key.toString("base64url"),
  ].join("$")
}

export async function verifyDemoPassword(
  password: string,
  passwordHash: string
) {
  const [, params, salt, key] = passwordHash.split("$")

  if (!params || !salt || !key) {
    return false
  }

  const optionPairs = Object.fromEntries(
    params.split(",").map((pair) => pair.split("="))
  )
  const derivedKey = await deriveScryptKey(
    password,
    Buffer.from(salt, "base64url"),
    Buffer.from(key, "base64url").length,
    {
      ...scryptOptions,
      N: Number(optionPairs.N),
      p: Number(optionPairs.p),
      r: Number(optionPairs.r),
    }
  )
  const expectedKey = Buffer.from(key, "base64url")

  return (
    derivedKey.length === expectedKey.length &&
    timingSafeEqual(derivedKey, expectedKey)
  )
}

function deriveScryptKey(
  password: string,
  salt: Buffer,
  keyLength: number,
  options: typeof scryptOptions
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, keyLength, options, (error, derivedKey) => {
      if (error) {
        reject(error)
        return
      }

      resolve(derivedKey)
    })
  })
}

function isCliEntrypoint() {
  return (
    process.argv[1] !== undefined &&
    import.meta.url === pathToFileURL(process.argv[1]).href
  )
}

if (isCliEntrypoint()) {
  const dryRun = process.argv.includes("--dry-run")

  seedDemoDatabase(process.env.DATABASE_URL, { dryRun })
    .then((summary) => {
      console.log(
        JSON.stringify(
          {
            job: "db-seed-demo",
            mode: dryRun ? "dry-run" : "apply",
            status: "ok",
            ...summary,
            demoAccounts: [
              "rifugio.torino@demo.adottaungatto.local",
              "volontari.italia@demo.adottaungatto.local",
              "marta.demo@demo.adottaungatto.local",
            ],
          },
          null,
          2
        )
      )
    })
    .catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error)

      console.error(
        JSON.stringify(
          {
            job: "db-seed-demo",
            message,
            status: "error",
          },
          null,
          2
        )
      )
      process.exitCode = 1
    })
}
