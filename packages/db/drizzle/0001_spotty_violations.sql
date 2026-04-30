CREATE TYPE "public"."geo_import_status" AS ENUM('staged', 'applied', 'failed');--> statement-breakpoint
ALTER TYPE "public"."province_type" ADD VALUE 'non_administrative_unit';--> statement-breakpoint
CREATE TABLE "geo_import_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_name" text NOT NULL,
	"source_url" text NOT NULL,
	"source_checksum" text NOT NULL,
	"source_bytes" integer NOT NULL,
	"source_fetched_at" timestamp with time zone NOT NULL,
	"reference_date" timestamp with time zone NOT NULL,
	"status" "geo_import_status" DEFAULT 'staged' NOT NULL,
	"summary" jsonb NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"finished_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "geo_import_staged_municipalities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"import_run_id" uuid NOT NULL,
	"region_istat_code" text NOT NULL,
	"province_istat_code" text NOT NULL,
	"historic_province_code" text NOT NULL,
	"progressive_code" text NOT NULL,
	"istat_code" text NOT NULL,
	"numeric_code" text NOT NULL,
	"cadastral_code" text NOT NULL,
	"name" text NOT NULL,
	"italian_name" text NOT NULL,
	"alternative_name" text,
	"slug" text NOT NULL,
	"name_normalized" text NOT NULL,
	"is_province_capital" boolean NOT NULL,
	"nuts1_2021" text NOT NULL,
	"nuts2_2021" text NOT NULL,
	"nuts3_2021" text NOT NULL,
	"nuts1_2024" text NOT NULL,
	"nuts2_2024" text NOT NULL,
	"nuts3_2024" text NOT NULL,
	"raw_data" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "geo_import_staged_provinces" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"import_run_id" uuid NOT NULL,
	"region_istat_code" text NOT NULL,
	"istat_code" text NOT NULL,
	"historic_province_code" text NOT NULL,
	"name" text NOT NULL,
	"type" "province_type" NOT NULL,
	"slug" text NOT NULL,
	"vehicle_code" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "geo_import_staged_regions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"import_run_id" uuid NOT NULL,
	"istat_code" text NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"geographical_area_code" text NOT NULL,
	"geographical_area_name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "geo_import_staged_municipalities" ADD CONSTRAINT "geo_import_staged_municipalities_import_run_id_geo_import_runs_id_fk" FOREIGN KEY ("import_run_id") REFERENCES "public"."geo_import_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "geo_import_staged_provinces" ADD CONSTRAINT "geo_import_staged_provinces_import_run_id_geo_import_runs_id_fk" FOREIGN KEY ("import_run_id") REFERENCES "public"."geo_import_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "geo_import_staged_regions" ADD CONSTRAINT "geo_import_staged_regions_import_run_id_geo_import_runs_id_fk" FOREIGN KEY ("import_run_id") REFERENCES "public"."geo_import_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "geo_import_runs_checksum_idx" ON "geo_import_runs" USING btree ("source_checksum");--> statement-breakpoint
CREATE UNIQUE INDEX "geo_staged_municipalities_run_istat_idx" ON "geo_import_staged_municipalities" USING btree ("import_run_id","istat_code");--> statement-breakpoint
CREATE UNIQUE INDEX "geo_staged_provinces_run_istat_idx" ON "geo_import_staged_provinces" USING btree ("import_run_id","istat_code");--> statement-breakpoint
CREATE UNIQUE INDEX "geo_staged_regions_run_istat_idx" ON "geo_import_staged_regions" USING btree ("import_run_id","istat_code");