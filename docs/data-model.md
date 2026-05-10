# Modello dati

Questo documento descrive lo stato reale dello schema Drizzle al 7 maggio 2026
e separa gli elementi gia implementati da quelli pianificati.

## Implementato

### Identity

`users`

- `id`
- `email`
- `email_normalized`
- `password_hash`
- `email_verified_at`
- `phone_e164`
- `phone_verified_at`
- `display_name`
- `profile_type`: `private`, `professional`, `association`, `shelter`,
  `breeder`
- `status`: `active`, `pending_verification`, `suspended`, `deleted`
- `deleted_at`
- `created_at`, `updated_at`

`roles`

- `id`
- `code`
- `name`
- `description`
- `created_at`, `updated_at`

`user_roles`

- `user_id`
- `role_id`
- `granted_by_user_id`
- `created_at`

`sessions`

- `id`
- `user_id`
- `token_hash`
- `expires_at`
- `created_at`
- `last_seen_at`
- `revoked_at`

`email_verification_tokens`

- `id`
- `user_id`
- `email`
- `token_hash`
- `expires_at`
- `consumed_at`
- `created_at`, `updated_at`

`password_reset_tokens`

- `id`
- `user_id`
- `email`
- `token_hash`
- `expires_at`
- `consumed_at`
- `created_at`, `updated_at`

`user_notification_preferences`

- `user_id`
- `listing_moderation_decision_email_enabled`
- `listing_report_decision_email_enabled`
- `created_at`, `updated_at`

### Geografia

`geo_regions`

- `id`
- `istat_code`
- `name`
- `slug`
- `geom`
- `centroid`
- `valid_from`
- `valid_to`
- `created_at`, `updated_at`

`geo_provinces`

- `id`
- `region_id`
- `istat_code`
- `vehicle_code`
- `name`
- `type`: `province`, `metropolitan_city`, `free_municipal_consortium`,
  `autonomous_province`, `non_administrative_unit`
- `slug`
- `geom`
- `centroid`
- `valid_from`
- `valid_to`
- `created_at`, `updated_at`

`geo_municipalities`

- `id`
- `province_id`
- `region_id`
- `istat_code`
- `name`
- `slug`
- `name_normalized`
- `geom`
- `centroid`
- `valid_from`
- `valid_to`
- `is_active`
- `created_at`, `updated_at`

`geo_import_runs`

- `id`
- `source_name`
- `source_url`
- `source_checksum`
- `source_bytes`
- `source_fetched_at`
- `reference_date`
- `status`
- `summary`
- `started_at`
- `finished_at`
- `created_at`, `updated_at`

`geo_import_staged_regions`

- `id`
- `import_run_id`
- `istat_code`
- `name`
- `slug`
- `geographical_area_code`
- `geographical_area_name`
- `created_at`, `updated_at`

`geo_import_staged_provinces`

- `id`
- `import_run_id`
- `region_istat_code`
- `istat_code`
- `historic_province_code`
- `name`
- `type`
- `slug`
- `vehicle_code`
- `created_at`, `updated_at`

`geo_import_staged_municipalities`

- `id`
- `import_run_id`
- `region_istat_code`
- `province_istat_code`
- `historic_province_code`
- `progressive_code`
- `istat_code`
- `numeric_code`
- `cadastral_code`
- `name`
- `italian_name`
- `alternative_name`
- `slug`
- `name_normalized`
- `is_province_capital`
- `nuts1_2021`, `nuts2_2021`, `nuts3_2021`
- `nuts1_2024`, `nuts2_2024`, `nuts3_2024`
- `raw_data`
- `created_at`, `updated_at`

### Annunci

`cat_breeds`

- `id`
- `name`
- `slug`
- `synonyms`
- `is_active`
- `sort_order`
- `created_at`, `updated_at`

`listings`

- `id`
- `owner_user_id`
- `title`
- `slug`
- `description`
- `breed_id`
- `sex`: `male`, `female`, `unknown`
- `age_months_min`
- `age_months_max`
- `municipality_id`
- `province_id`
- `region_id`
- `location_point`
- `contribution_cents`
- `is_free`
- `is_vaccinated`
- `is_sterilized`
- `is_dewormed`
- `has_microchip`
- `contact_requests_enabled`
- `moderation_status`: `draft`, `pending_review`, `approved`, `rejected`,
  `suspended`
- `lifecycle_status`: `draft`, `published`, `expired`, `adopted`, `deleted`
- `published_at`
- `expires_at`
- `deleted_at`
- `created_at`, `updated_at`

Indici pubblici attuali:

- `listings_location_point_gix`
- `listings_location_geography_gix`
- `listings_public_age_idx`
- `listings_public_breed_sex_idx`
- `listings_public_care_idx`
- `listings_public_location_idx`
- `listings_public_recent_idx`

`listing_images`

- `id`
- `listing_id`
- `object_key_original`
- `object_key_large`
- `object_key_thumb`
- `mime_type`
- `width`
- `height`
- `size_bytes`
- `checksum`
- `blur_hash`
- `sort_order`
- `is_cover`
- `status`: `uploaded`, `processing`, `ready`, `rejected`, `deleted`
- `rejection_reason`
- `deleted_at`
- `created_at`, `updated_at`

### Interazioni

`listing_likes`

- `listing_id`
- `user_id`
- `created_at`

`listing_favorites`

- `listing_id`
- `user_id`
- `created_at`

### Ricerca annunci

`listing_search_documents`

- `listing_id`
- `owner_user_id`
- `title`
- `description`
- `breed_name`
- `breed_slug`
- `municipality_name`
- `province_name`
- `region_name`
- `search_text`
- `search_vector`
- `location_point`
- `published_at`
- `ready_image_count`
- `has_cover_image`
- `like_count`
- `profile_type`
- `quality_score`
- `trust_score`
- `indexed_at`

Indici principali:

- `listing_search_documents_vector_gin`
- `listing_search_documents_search_text_trgm_gin`
- `listing_search_documents_location_point_gix`
- `listing_search_documents_location_geography_gix`
- `listing_search_documents_published_idx`
- `listing_search_documents_quality_idx`
- `listing_search_documents_owner_user_idx`
- `created_at`, `updated_at`

La tabella e' denormalizzata per la ricerca pubblica PostgreSQL. La migrazione
`0012_aromatic_lyja.sql` la popola inizialmente dagli annunci gia pubblicati e
crea indici GIN, GiST e btree. La migrazione `0013_elite_juggernaut.sql`
aggiunge indici GiST expression su `location_point::geography` per query
distanza. Il refresh idempotente e' collegato a decisioni di moderazione,
processing immagini del worker e like/unlike.

### Moderazione

`moderation_cases`

- `id`
- `listing_id`
- `opened_by_user_id`
- `assigned_to_user_id`
- `status`: `open`, `approved`, `rejected`, `suspended`, `closed`
- `reason_code`
- `notes`
- `closed_at`
- `created_at`, `updated_at`

`moderation_actions`

- `id`
- `case_id`
- `actor_user_id`
- `action`: `opened`, `assigned`, `approved`, `rejected`, `suspended`,
  `closed`, `commented`, `reported`
- `reason_code`
- `reason_text`
- `from_status`
- `to_status`
- `metadata`
- `created_at`

`reports`

- `id`
- `reporter_user_id`
- `moderation_case_id`
- `target_type`: `listing`, `profile`
- `target_id`
- `reason_code`
- `description`
- `status`: `open`, `linked`, `resolved`, `dismissed`
- `resolved_at`
- `created_at`, `updated_at`

### Notifiche

`notifications`

- `id`
- `user_id`
- `type`: `listing_moderation_decision`, `listing_report_decision`
- `payload`
- `read_at`
- `created_at`

### Contatti

`listing_contact_requests`

- `id`
- `listing_id`
- `requester_user_id`
- `owner_user_id`
- `requester_display_name_snapshot`
- `message`
- `status`: `pending`, `sent`, `failed`
- `email_shared`
- `delivered_at`
- `failed_at`
- `failure_reason`
- `created_at`, `updated_at`

## Pianificato

Questi elementi erano gia citati nella documentazione iniziale o sono emersi
come necessari, ma non sono ancora nello schema:

- `geo_place_aliases` per alias territoriali;
- `audit_logs` trasversale non legato solo alla moderazione;
- campi profilo pubblico esteso;
- cambio email e verifica telefono completa;
- entita per campagne sponsorizzate;
- tabelle amministrative per policy interne e template motivazioni;
- retention e richieste GDPR/export/cancellazione.
