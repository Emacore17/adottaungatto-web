CREATE TYPE "public"."listing_image_status" AS ENUM('uploaded', 'processing', 'ready', 'rejected', 'deleted');--> statement-breakpoint
CREATE TYPE "public"."moderation_action_type" AS ENUM('opened', 'assigned', 'approved', 'rejected', 'suspended', 'closed', 'commented', 'reported');--> statement-breakpoint
CREATE TYPE "public"."moderation_case_status" AS ENUM('open', 'approved', 'rejected', 'suspended', 'closed');--> statement-breakpoint
CREATE TYPE "public"."report_status" AS ENUM('open', 'linked', 'resolved', 'dismissed');--> statement-breakpoint
CREATE TYPE "public"."report_target_type" AS ENUM('listing', 'profile');--> statement-breakpoint
CREATE TABLE "listing_images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"listing_id" uuid NOT NULL,
	"object_key_original" text NOT NULL,
	"object_key_large" text,
	"object_key_thumb" text,
	"mime_type" text,
	"width" integer,
	"height" integer,
	"size_bytes" integer,
	"checksum" text,
	"blur_hash" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_cover" boolean DEFAULT false NOT NULL,
	"status" "listing_image_status" DEFAULT 'uploaded' NOT NULL,
	"rejection_reason" text,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "moderation_actions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" uuid NOT NULL,
	"actor_user_id" uuid,
	"action" "moderation_action_type" NOT NULL,
	"reason_code" text,
	"reason_text" text,
	"from_status" "listing_moderation_status",
	"to_status" "listing_moderation_status",
	"metadata" jsonb DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "moderation_cases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"listing_id" uuid NOT NULL,
	"opened_by_user_id" uuid,
	"assigned_to_user_id" uuid,
	"status" "moderation_case_status" DEFAULT 'open' NOT NULL,
	"reason_code" text,
	"notes" text,
	"closed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reporter_user_id" uuid,
	"moderation_case_id" uuid,
	"target_type" "report_target_type" NOT NULL,
	"target_id" uuid NOT NULL,
	"reason_code" text NOT NULL,
	"description" text,
	"status" "report_status" DEFAULT 'open' NOT NULL,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "listing_images" ADD CONSTRAINT "listing_images_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moderation_actions" ADD CONSTRAINT "moderation_actions_case_id_moderation_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."moderation_cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moderation_actions" ADD CONSTRAINT "moderation_actions_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moderation_cases" ADD CONSTRAINT "moderation_cases_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moderation_cases" ADD CONSTRAINT "moderation_cases_opened_by_user_id_users_id_fk" FOREIGN KEY ("opened_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moderation_cases" ADD CONSTRAINT "moderation_cases_assigned_to_user_id_users_id_fk" FOREIGN KEY ("assigned_to_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_reporter_user_id_users_id_fk" FOREIGN KEY ("reporter_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_moderation_case_id_moderation_cases_id_fk" FOREIGN KEY ("moderation_case_id") REFERENCES "public"."moderation_cases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "listing_images_active_cover_idx" ON "listing_images" USING btree ("listing_id") WHERE "listing_images"."is_cover" = true AND "listing_images"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "listing_images_listing_sort_idx" ON "listing_images" USING btree ("listing_id","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "listing_images_object_key_original_idx" ON "listing_images" USING btree ("object_key_original");--> statement-breakpoint
CREATE INDEX "listing_images_status_idx" ON "listing_images" USING btree ("status");--> statement-breakpoint
CREATE INDEX "moderation_actions_actor_idx" ON "moderation_actions" USING btree ("actor_user_id");--> statement-breakpoint
CREATE INDEX "moderation_actions_case_idx" ON "moderation_actions" USING btree ("case_id");--> statement-breakpoint
CREATE INDEX "moderation_cases_assigned_status_idx" ON "moderation_cases" USING btree ("assigned_to_user_id","status");--> statement-breakpoint
CREATE INDEX "moderation_cases_listing_status_idx" ON "moderation_cases" USING btree ("listing_id","status");--> statement-breakpoint
CREATE INDEX "reports_case_idx" ON "reports" USING btree ("moderation_case_id");--> statement-breakpoint
CREATE INDEX "reports_reporter_idx" ON "reports" USING btree ("reporter_user_id");--> statement-breakpoint
CREATE INDEX "reports_target_status_idx" ON "reports" USING btree ("target_type","target_id","status");