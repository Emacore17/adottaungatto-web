CREATE TABLE "listing_favorites" (
	"listing_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "listing_favorites_pk" PRIMARY KEY("listing_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "listing_favorites" ADD CONSTRAINT "listing_favorites_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listing_favorites" ADD CONSTRAINT "listing_favorites_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "listing_favorites_listing_idx" ON "listing_favorites" USING btree ("listing_id");--> statement-breakpoint
CREATE INDEX "listing_favorites_user_created_idx" ON "listing_favorites" USING btree ("user_id","created_at");