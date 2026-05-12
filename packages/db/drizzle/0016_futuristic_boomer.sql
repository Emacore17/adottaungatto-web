CREATE TABLE "listing_promotions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"listing_id" uuid NOT NULL,
	"placement" text DEFAULT 'listings_top' NOT NULL,
	"label" text DEFAULT 'Sponsorizzato' NOT NULL,
	"priority" integer DEFAULT 100 NOT NULL,
	"starts_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ends_at" timestamp with time zone,
	"is_active" boolean DEFAULT true NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "listing_promotions" ADD CONSTRAINT "listing_promotions_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "listing_promotions_active_listing_placement_idx" ON "listing_promotions" USING btree ("listing_id","placement") WHERE "listing_promotions"."is_active" = true AND "listing_promotions"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "listing_promotions_active_placement_idx" ON "listing_promotions" USING btree ("placement","priority","starts_at","ends_at") WHERE "listing_promotions"."is_active" = true AND "listing_promotions"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "listing_promotions_listing_idx" ON "listing_promotions" USING btree ("listing_id");