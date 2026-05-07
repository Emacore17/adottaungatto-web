CREATE TABLE "user_notification_preferences" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"listing_moderation_decision_email_enabled" boolean DEFAULT true NOT NULL,
	"listing_report_decision_email_enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_notification_preferences" ADD CONSTRAINT "user_notification_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "user_notification_preferences_moderation_email_idx" ON "user_notification_preferences" USING btree ("listing_moderation_decision_email_enabled");--> statement-breakpoint
CREATE INDEX "user_notification_preferences_report_email_idx" ON "user_notification_preferences" USING btree ("listing_report_decision_email_enabled");