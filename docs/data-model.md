# Modello dati iniziale

Questo modello e' intenzionalmente iniziale. Serve a guidare schema e
migrazioni, non a congelare tutte le funzionalita future.

## Tabelle identity

### users

- `id`
- `email`
- `email_normalized`
- `password_hash`
- `email_verified_at`
- `phone_e164`
- `phone_verified_at`
- `display_name`
- `profile_type`: `private`, `professional`, `association`, `shelter`, `breeder`
- `status`: `active`, `pending_verification`, `suspended`, `deleted`
- `created_at`, `updated_at`, `deleted_at`

### roles

- `id`
- `code`: `registered_user`, `professional_user`, `moderator`, `admin`
- `name`
- `description`

### user_roles

- `user_id`
- `role_id`
- `granted_by_user_id`
- `created_at`

### sessions

- `id`
- `user_id`
- `token_hash`
- `expires_at`
- `created_at`
- `last_seen_at`
- `revoked_at`

### email_verification_tokens

- `id`
- `user_id`
- `email`
- `token_hash`
- `expires_at`
- `consumed_at`
- `created_at`, `updated_at`

### password_reset_tokens

- `id`
- `user_id`
- `email`
- `token_hash`
- `expires_at`
- `consumed_at`
- `created_at`, `updated_at`

## Tabelle geografia

### geo_regions

- `id`
- `istat_code`
- `name`
- `slug`
- `geom`
- `centroid`
- `valid_from`
- `valid_to`

### geo_provinces

- `id`
- `region_id`
- `istat_code`
- `vehicle_code`
- `name`
- `type`: `province`, `metropolitan_city`, `free_municipal_consortium`, `autonomous_province`
- `slug`
- `geom`
- `centroid`
- `valid_from`
- `valid_to`

### geo_municipalities

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

### geo_place_aliases

- `id`
- `place_type`: `region`, `province`, `municipality`
- `place_id`
- `alias`
- `alias_normalized`
- `source`

### geo_import_runs

- `id`
- `source_name`
- `source_url`
- `source_reference_date`
- `started_at`
- `finished_at`
- `status`
- `checksum`
- `summary_json`

## Tabelle annunci

### cat_breeds

- `id`
- `name`
- `slug`
- `synonyms`
- `is_active`
- `sort_order`

### listings

- `id`
- `owner_user_id`
- `title`
- `slug`
- `description`
- `species`: inizialmente sempre `cat`
- `breed_id`
- `breed_type`: `purebred`, `mixed`, `not_breed`, `unknown`
- `sex`: `male`, `female`, `unknown`
- `estimated_birth_date`
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
- `contact_email_enabled`
- `contact_phone_enabled`
- `moderation_status`: `draft`, `pending_review`, `approved`, `rejected`, `suspended`
- `lifecycle_status`: `draft`, `published`, `expired`, `adopted`, `deleted`
- `published_at`
- `expires_at`
- `created_at`, `updated_at`, `deleted_at`

### listing_images

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
- `created_at`, `updated_at`, `deleted_at`

## Tabelle interazioni

### listing_likes

- `listing_id`
- `user_id`
- `created_at`

### listing_favorites

- `listing_id`
- `user_id`
- `created_at`

### listing_contact_requests

- `id`
- `listing_id`
- `requester_user_id`
- `owner_user_id`
- `message`
- `status`
- `created_at`

## Tabelle moderazione

### moderation_cases

- `id`
- `listing_id`
- `opened_by_user_id`
- `assigned_to_user_id`
- `status`: `open`, `approved`, `rejected`, `suspended`, `closed`
- `reason_code`
- `notes`
- `created_at`
- `closed_at`

### moderation_actions

- `id`
- `case_id`
- `actor_user_id`
- `action`
- `reason_code`
- `reason_text`
- `from_status`
- `to_status`
- `created_at`

### reports

- `id`
- `reporter_user_id`
- `moderation_case_id`
- `target_type`: `listing`, `profile`
- `target_id`
- `reason_code`
- `description`
- `status`: `open`, `linked`, `resolved`, `dismissed`
- `created_at`, `updated_at`
- `resolved_at`

## Tabelle trasversali

### notifications

- `id`
- `user_id`
- `type`
- `payload_json`
- `read_at`
- `created_at`

### audit_logs

- `id`
- `actor_user_id`
- `action`
- `target_type`
- `target_id`
- `ip_address`
- `user_agent`
- `metadata_json`
- `created_at`
