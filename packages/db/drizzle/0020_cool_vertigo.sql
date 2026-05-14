CREATE TYPE "public"."listing_contact_phone_mode" AS ENUM('none', 'account', 'listing');--> statement-breakpoint
CREATE TABLE "listing_phone_verification_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"listing_id" uuid NOT NULL,
	"phone_e164" text NOT NULL,
	"code_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "contact_phone_mode" "listing_contact_phone_mode" DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "contact_phone_e164" text;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "contact_phone_verified_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "show_phone_on_listings" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "listing_phone_verification_codes" ADD CONSTRAINT "listing_phone_verification_codes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listing_phone_verification_codes" ADD CONSTRAINT "listing_phone_verification_codes_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "listing_phone_verification_codes_listing_active_idx" ON "listing_phone_verification_codes" USING btree ("listing_id","consumed_at","expires_at");--> statement-breakpoint
CREATE INDEX "listing_phone_verification_codes_user_active_idx" ON "listing_phone_verification_codes" USING btree ("user_id","consumed_at","expires_at");