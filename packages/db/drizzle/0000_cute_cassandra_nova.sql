CREATE EXTENSION IF NOT EXISTS "pgcrypto";--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS "postgis";--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS "unaccent";--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS "pg_trgm";--> statement-breakpoint
CREATE TYPE "public"."listing_lifecycle_status" AS ENUM('draft', 'published', 'expired', 'adopted', 'deleted');--> statement-breakpoint
CREATE TYPE "public"."listing_moderation_status" AS ENUM('draft', 'pending_review', 'approved', 'rejected', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."listing_sex" AS ENUM('male', 'female', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."profile_type" AS ENUM('private', 'professional', 'association', 'shelter', 'breeder');--> statement-breakpoint
CREATE TYPE "public"."province_type" AS ENUM('province', 'metropolitan_city', 'free_municipal_consortium', 'autonomous_province');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('active', 'pending_verification', 'suspended', 'deleted');--> statement-breakpoint
CREATE TABLE "cat_breeds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"synonyms" jsonb DEFAULT '[]' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cat_breeds_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "geo_municipalities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"province_id" uuid NOT NULL,
	"region_id" uuid NOT NULL,
	"istat_code" text NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"name_normalized" text NOT NULL,
	"geom" geometry(MultiPolygon, 4326),
	"centroid" geometry(Point, 4326),
	"valid_from" timestamp with time zone NOT NULL,
	"valid_to" timestamp with time zone,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "geo_provinces" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"region_id" uuid NOT NULL,
	"istat_code" text NOT NULL,
	"vehicle_code" text,
	"name" text NOT NULL,
	"type" "province_type" DEFAULT 'province' NOT NULL,
	"slug" text NOT NULL,
	"geom" geometry(MultiPolygon, 4326),
	"centroid" geometry(Point, 4326),
	"valid_from" timestamp with time zone NOT NULL,
	"valid_to" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "geo_regions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"istat_code" text NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"geom" geometry(MultiPolygon, 4326),
	"centroid" geometry(Point, 4326),
	"valid_from" timestamp with time zone NOT NULL,
	"valid_to" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "listings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"description" text NOT NULL,
	"breed_id" uuid,
	"sex" "listing_sex" DEFAULT 'unknown' NOT NULL,
	"age_months_min" integer,
	"age_months_max" integer,
	"municipality_id" uuid,
	"province_id" uuid,
	"region_id" uuid,
	"location_point" geometry(Point, 4326),
	"contribution_cents" integer,
	"is_free" boolean DEFAULT true NOT NULL,
	"is_vaccinated" boolean,
	"is_sterilized" boolean,
	"is_dewormed" boolean,
	"has_microchip" boolean,
	"moderation_status" "listing_moderation_status" DEFAULT 'draft' NOT NULL,
	"lifecycle_status" "listing_lifecycle_status" DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "roles_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"email_normalized" text NOT NULL,
	"password_hash" text,
	"email_verified_at" timestamp with time zone,
	"phone_e164" text,
	"phone_verified_at" timestamp with time zone,
	"display_name" text NOT NULL,
	"profile_type" "profile_type" DEFAULT 'private' NOT NULL,
	"status" "user_status" DEFAULT 'pending_verification' NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "geo_municipalities" ADD CONSTRAINT "geo_municipalities_province_id_geo_provinces_id_fk" FOREIGN KEY ("province_id") REFERENCES "public"."geo_provinces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "geo_municipalities" ADD CONSTRAINT "geo_municipalities_region_id_geo_regions_id_fk" FOREIGN KEY ("region_id") REFERENCES "public"."geo_regions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "geo_provinces" ADD CONSTRAINT "geo_provinces_region_id_geo_regions_id_fk" FOREIGN KEY ("region_id") REFERENCES "public"."geo_regions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_breed_id_cat_breeds_id_fk" FOREIGN KEY ("breed_id") REFERENCES "public"."cat_breeds"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_municipality_id_geo_municipalities_id_fk" FOREIGN KEY ("municipality_id") REFERENCES "public"."geo_municipalities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_province_id_geo_provinces_id_fk" FOREIGN KEY ("province_id") REFERENCES "public"."geo_provinces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_region_id_geo_regions_id_fk" FOREIGN KEY ("region_id") REFERENCES "public"."geo_regions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "geo_municipalities_centroid_gix" ON "geo_municipalities" USING gist ("centroid");--> statement-breakpoint
CREATE UNIQUE INDEX "geo_municipalities_istat_valid_from_idx" ON "geo_municipalities" USING btree ("istat_code","valid_from");--> statement-breakpoint
CREATE INDEX "geo_provinces_centroid_gix" ON "geo_provinces" USING gist ("centroid");--> statement-breakpoint
CREATE INDEX "geo_regions_centroid_gix" ON "geo_regions" USING gist ("centroid");--> statement-breakpoint
CREATE UNIQUE INDEX "geo_regions_istat_valid_from_idx" ON "geo_regions" USING btree ("istat_code","valid_from");--> statement-breakpoint
CREATE INDEX "listings_location_point_gix" ON "listings" USING gist ("location_point");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_normalized_idx" ON "users" USING btree ("email_normalized");
