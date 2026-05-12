import { sql } from "drizzle-orm"
import {
  boolean,
  customType,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core"

const geometryPoint = customType<{ data: string; driverData: string }>({
  dataType() {
    return "geometry(Point, 4326)"
  },
})

const geometryMultiPolygon = customType<{ data: string; driverData: string }>({
  dataType() {
    return "geometry(MultiPolygon, 4326)"
  },
})

const tsVector = customType<{ data: string; driverData: string }>({
  dataType() {
    return "tsvector"
  },
})

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
}

export const profileType = pgEnum("profile_type", [
  "private",
  "professional",
  "association",
  "shelter",
  "breeder",
])

export const userStatus = pgEnum("user_status", [
  "active",
  "pending_verification",
  "suspended",
  "deleted",
])

export const provinceType = pgEnum("province_type", [
  "province",
  "metropolitan_city",
  "free_municipal_consortium",
  "autonomous_province",
  "non_administrative_unit",
])

export const geoImportStatus = pgEnum("geo_import_status", [
  "staged",
  "applied",
  "failed",
])

export const listingModerationStatus = pgEnum("listing_moderation_status", [
  "draft",
  "pending_review",
  "approved",
  "rejected",
  "suspended",
])

export const listingLifecycleStatus = pgEnum("listing_lifecycle_status", [
  "draft",
  "published",
  "expired",
  "adopted",
  "deleted",
])

export const listingSex = pgEnum("listing_sex", ["male", "female", "unknown"])

export const listingImageStatus = pgEnum("listing_image_status", [
  "uploaded",
  "processing",
  "ready",
  "rejected",
  "deleted",
])

export const moderationCaseStatus = pgEnum("moderation_case_status", [
  "open",
  "approved",
  "rejected",
  "suspended",
  "closed",
])

export const moderationActionType = pgEnum("moderation_action_type", [
  "opened",
  "assigned",
  "approved",
  "rejected",
  "suspended",
  "closed",
  "commented",
  "reported",
])

export const reportTargetType = pgEnum("report_target_type", [
  "listing",
  "profile",
])

export const reportStatus = pgEnum("report_status", [
  "open",
  "linked",
  "resolved",
  "dismissed",
])

export const notificationType = pgEnum("notification_type", [
  "listing_moderation_decision",
  "listing_report_decision",
])

export const listingContactRequestStatus = pgEnum(
  "listing_contact_request_status",
  ["pending", "sent", "failed"]
)

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    emailNormalized: text("email_normalized").notNull(),
    passwordHash: text("password_hash"),
    emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
    phoneE164: text("phone_e164"),
    phoneVerifiedAt: timestamp("phone_verified_at", { withTimezone: true }),
    displayName: text("display_name").notNull(),
    profileType: profileType("profile_type").notNull().default("private"),
    status: userStatus("status").notNull().default("pending_verification"),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => ({
    emailNormalizedIdx: uniqueIndex("users_email_normalized_idx").on(
      table.emailNormalized
    ),
  })
)

export const roles = pgTable("roles", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  ...timestamps,
})

export const userRoles = pgTable(
  "user_roles",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    grantedByUserId: uuid("granted_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    grantedByUserIdx: index("user_roles_granted_by_user_idx").on(
      table.grantedByUserId
    ),
    pk: primaryKey({
      columns: [table.userId, table.roleId],
      name: "user_roles_pk",
    }),
    roleIdx: index("user_roles_role_idx").on(table.roleId),
  })
)

export const userNotificationPreferences = pgTable(
  "user_notification_preferences",
  {
    userId: uuid("user_id")
      .primaryKey()
      .references(() => users.id, { onDelete: "cascade" }),
    listingModerationDecisionEmailEnabled: boolean(
      "listing_moderation_decision_email_enabled"
    )
      .notNull()
      .default(true),
    listingReportDecisionEmailEnabled: boolean(
      "listing_report_decision_email_enabled"
    )
      .notNull()
      .default(true),
    ...timestamps,
  },
  (table) => ({
    listingModerationDecisionEmailIdx: index(
      "user_notification_preferences_moderation_email_idx"
    ).on(table.listingModerationDecisionEmailEnabled),
    listingReportDecisionEmailIdx: index(
      "user_notification_preferences_report_email_idx"
    ).on(table.listingReportDecisionEmailEnabled),
  })
)

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (table) => ({
    expiresAtIdx: index("sessions_expires_at_idx").on(table.expiresAt),
    tokenHashIdx: uniqueIndex("sessions_token_hash_idx").on(table.tokenHash),
    userActiveIdx: index("sessions_user_active_idx").on(
      table.userId,
      table.revokedAt,
      table.expiresAt
    ),
  })
)

export const emailVerificationTokens = pgTable(
  "email_verification_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => ({
    tokenHashIdx: uniqueIndex("email_verification_tokens_hash_idx").on(
      table.tokenHash
    ),
    userActiveIdx: index("email_verification_tokens_user_active_idx").on(
      table.userId,
      table.consumedAt,
      table.expiresAt
    ),
  })
)

export const passwordResetTokens = pgTable(
  "password_reset_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => ({
    tokenHashIdx: uniqueIndex("password_reset_tokens_hash_idx").on(
      table.tokenHash
    ),
    userActiveIdx: index("password_reset_tokens_user_active_idx").on(
      table.userId,
      table.consumedAt,
      table.expiresAt
    ),
  })
)

export const geoRegions = pgTable(
  "geo_regions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    istatCode: text("istat_code").notNull(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    geom: geometryMultiPolygon("geom"),
    centroid: geometryPoint("centroid"),
    validFrom: timestamp("valid_from", { withTimezone: true }).notNull(),
    validTo: timestamp("valid_to", { withTimezone: true }),
    ...timestamps,
  },
  (table) => ({
    centroidIdx: index("geo_regions_centroid_gix").using(
      "gist",
      table.centroid
    ),
    istatCodeValidFromIdx: uniqueIndex("geo_regions_istat_valid_from_idx").on(
      table.istatCode,
      table.validFrom
    ),
  })
)

export const geoProvinces = pgTable(
  "geo_provinces",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    regionId: uuid("region_id")
      .notNull()
      .references(() => geoRegions.id),
    istatCode: text("istat_code").notNull(),
    vehicleCode: text("vehicle_code"),
    name: text("name").notNull(),
    type: provinceType("type").notNull().default("province"),
    slug: text("slug").notNull(),
    geom: geometryMultiPolygon("geom"),
    centroid: geometryPoint("centroid"),
    validFrom: timestamp("valid_from", { withTimezone: true }).notNull(),
    validTo: timestamp("valid_to", { withTimezone: true }),
    ...timestamps,
  },
  (table) => ({
    centroidIdx: index("geo_provinces_centroid_gix").using(
      "gist",
      table.centroid
    ),
    istatCodeValidFromIdx: uniqueIndex("geo_provinces_istat_valid_from_idx").on(
      table.istatCode,
      table.validFrom
    ),
  })
)

export const geoMunicipalities = pgTable(
  "geo_municipalities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    provinceId: uuid("province_id")
      .notNull()
      .references(() => geoProvinces.id),
    regionId: uuid("region_id")
      .notNull()
      .references(() => geoRegions.id),
    istatCode: text("istat_code").notNull(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    nameNormalized: text("name_normalized").notNull(),
    geom: geometryMultiPolygon("geom"),
    centroid: geometryPoint("centroid"),
    validFrom: timestamp("valid_from", { withTimezone: true }).notNull(),
    validTo: timestamp("valid_to", { withTimezone: true }),
    isActive: boolean("is_active").notNull().default(true),
    ...timestamps,
  },
  (table) => ({
    centroidIdx: index("geo_municipalities_centroid_gix").using(
      "gist",
      table.centroid
    ),
    istatCodeValidFromIdx: uniqueIndex(
      "geo_municipalities_istat_valid_from_idx"
    ).on(table.istatCode, table.validFrom),
  })
)

export const catBreeds = pgTable("cat_breeds", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  synonyms: jsonb("synonyms")
    .$type<string[]>()
    .notNull()
    .default(sql`'[]'`),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  ...timestamps,
})

export const geoImportRuns = pgTable(
  "geo_import_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sourceName: text("source_name").notNull(),
    sourceUrl: text("source_url").notNull(),
    sourceChecksum: text("source_checksum").notNull(),
    sourceBytes: integer("source_bytes").notNull(),
    sourceFetchedAt: timestamp("source_fetched_at", {
      withTimezone: true,
    }).notNull(),
    referenceDate: timestamp("reference_date", {
      withTimezone: true,
    }).notNull(),
    status: geoImportStatus("status").notNull().default("staged"),
    summary: jsonb("summary").$type<Record<string, unknown>>().notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
    finishedAt: timestamp("finished_at", { withTimezone: true }).notNull(),
    ...timestamps,
  },
  (table) => ({
    sourceChecksumIdx: uniqueIndex("geo_import_runs_checksum_idx").on(
      table.sourceChecksum
    ),
  })
)

export const geoImportStagedRegions = pgTable(
  "geo_import_staged_regions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    importRunId: uuid("import_run_id")
      .notNull()
      .references(() => geoImportRuns.id, { onDelete: "cascade" }),
    istatCode: text("istat_code").notNull(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    geographicalAreaCode: text("geographical_area_code").notNull(),
    geographicalAreaName: text("geographical_area_name").notNull(),
    ...timestamps,
  },
  (table) => ({
    importRunIstatCodeIdx: uniqueIndex("geo_staged_regions_run_istat_idx").on(
      table.importRunId,
      table.istatCode
    ),
  })
)

export const geoImportStagedProvinces = pgTable(
  "geo_import_staged_provinces",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    importRunId: uuid("import_run_id")
      .notNull()
      .references(() => geoImportRuns.id, { onDelete: "cascade" }),
    regionIstatCode: text("region_istat_code").notNull(),
    istatCode: text("istat_code").notNull(),
    historicProvinceCode: text("historic_province_code").notNull(),
    name: text("name").notNull(),
    type: provinceType("type").notNull(),
    slug: text("slug").notNull(),
    vehicleCode: text("vehicle_code"),
    ...timestamps,
  },
  (table) => ({
    importRunIstatCodeIdx: uniqueIndex("geo_staged_provinces_run_istat_idx").on(
      table.importRunId,
      table.istatCode
    ),
  })
)

export const geoImportStagedMunicipalities = pgTable(
  "geo_import_staged_municipalities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    importRunId: uuid("import_run_id")
      .notNull()
      .references(() => geoImportRuns.id, { onDelete: "cascade" }),
    regionIstatCode: text("region_istat_code").notNull(),
    provinceIstatCode: text("province_istat_code").notNull(),
    historicProvinceCode: text("historic_province_code").notNull(),
    progressiveCode: text("progressive_code").notNull(),
    istatCode: text("istat_code").notNull(),
    numericCode: text("numeric_code").notNull(),
    cadastralCode: text("cadastral_code").notNull(),
    name: text("name").notNull(),
    italianName: text("italian_name").notNull(),
    alternativeName: text("alternative_name"),
    slug: text("slug").notNull(),
    nameNormalized: text("name_normalized").notNull(),
    isProvinceCapital: boolean("is_province_capital").notNull(),
    nuts1_2021: text("nuts1_2021").notNull(),
    nuts2_2021: text("nuts2_2021").notNull(),
    nuts3_2021: text("nuts3_2021").notNull(),
    nuts1_2024: text("nuts1_2024").notNull(),
    nuts2_2024: text("nuts2_2024").notNull(),
    nuts3_2024: text("nuts3_2024").notNull(),
    rawData: jsonb("raw_data").$type<Record<string, string>>().notNull(),
    ...timestamps,
  },
  (table) => ({
    importRunIstatCodeIdx: uniqueIndex(
      "geo_staged_municipalities_run_istat_idx"
    ).on(table.importRunId, table.istatCode),
  })
)

export const listings = pgTable(
  "listings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerUserId: uuid("owner_user_id")
      .notNull()
      .references(() => users.id),
    title: text("title").notNull(),
    slug: text("slug").notNull(),
    description: text("description").notNull(),
    breedId: uuid("breed_id").references(() => catBreeds.id),
    sex: listingSex("sex").notNull().default("unknown"),
    ageMonthsMin: integer("age_months_min"),
    ageMonthsMax: integer("age_months_max"),
    municipalityId: uuid("municipality_id").references(
      () => geoMunicipalities.id
    ),
    provinceId: uuid("province_id").references(() => geoProvinces.id),
    regionId: uuid("region_id").references(() => geoRegions.id),
    locationPoint: geometryPoint("location_point"),
    contributionCents: integer("contribution_cents"),
    isFree: boolean("is_free").notNull().default(true),
    isVaccinated: boolean("is_vaccinated"),
    isSterilized: boolean("is_sterilized"),
    isDewormed: boolean("is_dewormed"),
    hasMicrochip: boolean("has_microchip"),
    contactRequestsEnabled: boolean("contact_requests_enabled")
      .notNull()
      .default(true),
    moderationStatus: listingModerationStatus("moderation_status")
      .notNull()
      .default("draft"),
    lifecycleStatus: listingLifecycleStatus("lifecycle_status")
      .notNull()
      .default("draft"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => ({
    locationPointIdx: index("listings_location_point_gix").using(
      "gist",
      table.locationPoint
    ),
    locationGeographyIdx: index("listings_location_geography_gix").using(
      "gist",
      sql`(${table.locationPoint}::geography)`
    ),
    publicAgeIdx: index("listings_public_age_idx")
      .on(table.ageMonthsMin, table.ageMonthsMax)
      .where(
        sql`${table.moderationStatus} = 'approved' AND ${table.lifecycleStatus} = 'published' AND ${table.deletedAt} IS NULL`
      ),
    publicBreedSexIdx: index("listings_public_breed_sex_idx")
      .on(table.breedId, table.sex)
      .where(
        sql`${table.moderationStatus} = 'approved' AND ${table.lifecycleStatus} = 'published' AND ${table.deletedAt} IS NULL`
      ),
    publicCareIdx: index("listings_public_care_idx")
      .on(
        table.isFree,
        table.isVaccinated,
        table.isSterilized,
        table.isDewormed,
        table.hasMicrochip
      )
      .where(
        sql`${table.moderationStatus} = 'approved' AND ${table.lifecycleStatus} = 'published' AND ${table.deletedAt} IS NULL`
      ),
    publicLocationIdx: index("listings_public_location_idx")
      .on(table.regionId, table.provinceId, table.municipalityId)
      .where(
        sql`${table.moderationStatus} = 'approved' AND ${table.lifecycleStatus} = 'published' AND ${table.deletedAt} IS NULL`
      ),
    publicRecentIdx: index("listings_public_recent_idx")
      .on(table.publishedAt, table.updatedAt, table.id)
      .where(
        sql`${table.moderationStatus} = 'approved' AND ${table.lifecycleStatus} = 'published' AND ${table.deletedAt} IS NULL`
      ),
  })
)

export const listingImages = pgTable(
  "listing_images",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    listingId: uuid("listing_id")
      .notNull()
      .references(() => listings.id, { onDelete: "cascade" }),
    objectKeyOriginal: text("object_key_original").notNull(),
    objectKeyLarge: text("object_key_large"),
    objectKeyThumb: text("object_key_thumb"),
    mimeType: text("mime_type"),
    width: integer("width"),
    height: integer("height"),
    sizeBytes: integer("size_bytes"),
    checksum: text("checksum"),
    blurHash: text("blur_hash"),
    sortOrder: integer("sort_order").notNull().default(0),
    isCover: boolean("is_cover").notNull().default(false),
    status: listingImageStatus("status").notNull().default("uploaded"),
    rejectionReason: text("rejection_reason"),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => ({
    activeCoverIdx: uniqueIndex("listing_images_active_cover_idx")
      .on(table.listingId)
      .where(sql`${table.isCover} = true AND ${table.deletedAt} IS NULL`),
    listingSortIdx: index("listing_images_listing_sort_idx").on(
      table.listingId,
      table.sortOrder
    ),
    objectKeyOriginalIdx: uniqueIndex(
      "listing_images_object_key_original_idx"
    ).on(table.objectKeyOriginal),
    statusIdx: index("listing_images_status_idx").on(table.status),
  })
)

export const listingFavorites = pgTable(
  "listing_favorites",
  {
    listingId: uuid("listing_id")
      .notNull()
      .references(() => listings.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    listingIdx: index("listing_favorites_listing_idx").on(table.listingId),
    pk: primaryKey({
      columns: [table.listingId, table.userId],
      name: "listing_favorites_pk",
    }),
    userCreatedIdx: index("listing_favorites_user_created_idx").on(
      table.userId,
      table.createdAt
    ),
  })
)

export const listingLikes = pgTable(
  "listing_likes",
  {
    listingId: uuid("listing_id")
      .notNull()
      .references(() => listings.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    listingIdx: index("listing_likes_listing_idx").on(table.listingId),
    pk: primaryKey({
      columns: [table.listingId, table.userId],
      name: "listing_likes_pk",
    }),
    userCreatedIdx: index("listing_likes_user_created_idx").on(
      table.userId,
      table.createdAt
    ),
  })
)

export const listingPromotions = pgTable(
  "listing_promotions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    listingId: uuid("listing_id")
      .notNull()
      .references(() => listings.id, { onDelete: "cascade" }),
    placement: text("placement").notNull().default("listings_top"),
    label: text("label").notNull().default("Sponsorizzato"),
    priority: integer("priority").notNull().default(100),
    startsAt: timestamp("starts_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    isActive: boolean("is_active").notNull().default(true),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => ({
    activeListingPlacementIdx: uniqueIndex(
      "listing_promotions_active_listing_placement_idx"
    )
      .on(table.listingId, table.placement)
      .where(sql`${table.isActive} = true AND ${table.deletedAt} IS NULL`),
    activePlacementIdx: index("listing_promotions_active_placement_idx")
      .on(table.placement, table.priority, table.startsAt, table.endsAt)
      .where(sql`${table.isActive} = true AND ${table.deletedAt} IS NULL`),
    listingIdx: index("listing_promotions_listing_idx").on(table.listingId),
  })
)

export const listingContactRequests = pgTable(
  "listing_contact_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    listingId: uuid("listing_id")
      .notNull()
      .references(() => listings.id, { onDelete: "cascade" }),
    requesterUserId: uuid("requester_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    ownerUserId: uuid("owner_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    requesterDisplayNameSnapshot: text(
      "requester_display_name_snapshot"
    ).notNull(),
    message: text("message").notNull(),
    status: listingContactRequestStatus("status").notNull().default("pending"),
    emailShared: boolean("email_shared").notNull().default(false),
    phoneShared: boolean("phone_shared").notNull().default(false),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    failedAt: timestamp("failed_at", { withTimezone: true }),
    failureReason: text("failure_reason"),
    ...timestamps,
  },
  (table) => ({
    listingCreatedIdx: index("listing_contact_requests_listing_created_idx").on(
      table.listingId,
      table.createdAt
    ),
    ownerCreatedIdx: index("listing_contact_requests_owner_created_idx").on(
      table.ownerUserId,
      table.createdAt
    ),
    requesterCreatedIdx: index(
      "listing_contact_requests_requester_created_idx"
    ).on(table.requesterUserId, table.createdAt),
  })
)

export const listingSearchDocuments = pgTable(
  "listing_search_documents",
  {
    listingId: uuid("listing_id")
      .primaryKey()
      .references(() => listings.id, { onDelete: "cascade" }),
    ownerUserId: uuid("owner_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description").notNull(),
    breedName: text("breed_name"),
    breedSlug: text("breed_slug"),
    municipalityName: text("municipality_name"),
    provinceName: text("province_name"),
    regionName: text("region_name"),
    searchText: text("search_text").notNull(),
    searchVector: tsVector("search_vector").notNull(),
    locationPoint: geometryPoint("location_point"),
    publishedAt: timestamp("published_at", { withTimezone: true }).notNull(),
    readyImageCount: integer("ready_image_count").notNull().default(0),
    hasCoverImage: boolean("has_cover_image").notNull().default(false),
    likeCount: integer("like_count").notNull().default(0),
    profileType: profileType("profile_type").notNull(),
    qualityScore: integer("quality_score").notNull().default(0),
    trustScore: integer("trust_score").notNull().default(0),
    indexedAt: timestamp("indexed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    ...timestamps,
  },
  (table) => ({
    locationPointIdx: index(
      "listing_search_documents_location_point_gix"
    ).using("gist", table.locationPoint),
    locationGeographyIdx: index(
      "listing_search_documents_location_geography_gix"
    ).using("gist", sql`(${table.locationPoint}::geography)`),
    ownerUserIdx: index("listing_search_documents_owner_user_idx").on(
      table.ownerUserId
    ),
    publishedIdx: index("listing_search_documents_published_idx").on(
      table.publishedAt,
      table.listingId
    ),
    qualityIdx: index("listing_search_documents_quality_idx").on(
      table.qualityScore,
      table.trustScore
    ),
    searchTextTrgmIdx: index(
      "listing_search_documents_search_text_trgm_gin"
    ).using("gin", sql`${table.searchText} gin_trgm_ops`),
    searchVectorIdx: index("listing_search_documents_vector_gin").using(
      "gin",
      table.searchVector
    ),
  })
)

export const moderationCases = pgTable(
  "moderation_cases",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    listingId: uuid("listing_id")
      .notNull()
      .references(() => listings.id, { onDelete: "cascade" }),
    openedByUserId: uuid("opened_by_user_id").references(() => users.id),
    assignedToUserId: uuid("assigned_to_user_id").references(() => users.id),
    status: moderationCaseStatus("status").notNull().default("open"),
    reasonCode: text("reason_code"),
    notes: text("notes"),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => ({
    assignedStatusIdx: index("moderation_cases_assigned_status_idx").on(
      table.assignedToUserId,
      table.status
    ),
    listingStatusIdx: index("moderation_cases_listing_status_idx").on(
      table.listingId,
      table.status
    ),
  })
)

export const moderationActions = pgTable(
  "moderation_actions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    caseId: uuid("case_id")
      .notNull()
      .references(() => moderationCases.id, { onDelete: "cascade" }),
    actorUserId: uuid("actor_user_id").references(() => users.id),
    action: moderationActionType("action").notNull(),
    reasonCode: text("reason_code"),
    reasonText: text("reason_text"),
    fromStatus: listingModerationStatus("from_status"),
    toStatus: listingModerationStatus("to_status"),
    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'`),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    actorIdx: index("moderation_actions_actor_idx").on(table.actorUserId),
    caseIdx: index("moderation_actions_case_idx").on(table.caseId),
  })
)

export const reports = pgTable(
  "reports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reporterUserId: uuid("reporter_user_id").references(() => users.id),
    moderationCaseId: uuid("moderation_case_id").references(
      () => moderationCases.id
    ),
    targetType: reportTargetType("target_type").notNull(),
    targetId: uuid("target_id").notNull(),
    reasonCode: text("reason_code").notNull(),
    description: text("description"),
    status: reportStatus("status").notNull().default("open"),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => ({
    caseIdx: index("reports_case_idx").on(table.moderationCaseId),
    reporterIdx: index("reports_reporter_idx").on(table.reporterUserId),
    targetStatusIdx: index("reports_target_status_idx").on(
      table.targetType,
      table.targetId,
      table.status
    ),
  })
)

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: notificationType("type").notNull(),
    payload: jsonb("payload")
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'`),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    userCreatedIdx: index("notifications_user_created_idx").on(
      table.userId,
      table.createdAt
    ),
    userReadCreatedIdx: index("notifications_user_read_created_idx").on(
      table.userId,
      table.readAt,
      table.createdAt
    ),
  })
)
