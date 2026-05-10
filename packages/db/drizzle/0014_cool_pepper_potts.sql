CREATE TYPE "public"."listing_contact_request_status" AS ENUM('pending', 'sent', 'failed');--> statement-breakpoint
CREATE TABLE "listing_contact_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"listing_id" uuid NOT NULL,
	"requester_user_id" uuid NOT NULL,
	"owner_user_id" uuid NOT NULL,
	"requester_display_name_snapshot" text NOT NULL,
	"message" text NOT NULL,
	"status" "listing_contact_request_status" DEFAULT 'pending' NOT NULL,
	"email_shared" boolean DEFAULT false NOT NULL,
	"delivered_at" timestamp with time zone,
	"failed_at" timestamp with time zone,
	"failure_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "listing_contact_requests" ADD CONSTRAINT "listing_contact_requests_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listing_contact_requests" ADD CONSTRAINT "listing_contact_requests_requester_user_id_users_id_fk" FOREIGN KEY ("requester_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listing_contact_requests" ADD CONSTRAINT "listing_contact_requests_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "listing_contact_requests_listing_created_idx" ON "listing_contact_requests" USING btree ("listing_id","created_at");--> statement-breakpoint
CREATE INDEX "listing_contact_requests_owner_created_idx" ON "listing_contact_requests" USING btree ("owner_user_id","created_at");--> statement-breakpoint
CREATE INDEX "listing_contact_requests_requester_created_idx" ON "listing_contact_requests" USING btree ("requester_user_id","created_at");