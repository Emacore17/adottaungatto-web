CREATE TABLE "listing_likes" (
	"listing_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "listing_likes_pk" PRIMARY KEY("listing_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "listing_likes" ADD CONSTRAINT "listing_likes_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listing_likes" ADD CONSTRAINT "listing_likes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "listing_likes_listing_idx" ON "listing_likes" USING btree ("listing_id");--> statement-breakpoint
CREATE INDEX "listing_likes_user_created_idx" ON "listing_likes" USING btree ("user_id","created_at");