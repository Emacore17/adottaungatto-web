CREATE TABLE "listing_search_documents" (
	"listing_id" uuid PRIMARY KEY NOT NULL,
	"owner_user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"breed_name" text,
	"breed_slug" text,
	"municipality_name" text,
	"province_name" text,
	"region_name" text,
	"search_text" text NOT NULL,
	"search_vector" "tsvector" NOT NULL,
	"location_point" geometry(Point, 4326),
	"published_at" timestamp with time zone NOT NULL,
	"ready_image_count" integer DEFAULT 0 NOT NULL,
	"has_cover_image" boolean DEFAULT false NOT NULL,
	"like_count" integer DEFAULT 0 NOT NULL,
	"profile_type" "profile_type" NOT NULL,
	"quality_score" integer DEFAULT 0 NOT NULL,
	"trust_score" integer DEFAULT 0 NOT NULL,
	"indexed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "listing_search_documents" ADD CONSTRAINT "listing_search_documents_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listing_search_documents" ADD CONSTRAINT "listing_search_documents_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
WITH ready_images AS (
	SELECT
		"listing_id",
		count(*)::integer AS "ready_image_count"
	FROM "listing_images"
	WHERE "status" = 'ready' AND "deleted_at" IS NULL
	GROUP BY "listing_id"
),
cover_images AS (
	SELECT
		"listing_id",
		bool_or("is_cover") AS "has_cover_image"
	FROM "listing_images"
	WHERE "status" = 'ready' AND "deleted_at" IS NULL
	GROUP BY "listing_id"
),
like_counts AS (
	SELECT
		"listing_id",
		count(*)::integer AS "like_count"
	FROM "listing_likes"
	GROUP BY "listing_id"
)
INSERT INTO "listing_search_documents" (
	"listing_id",
	"owner_user_id",
	"title",
	"description",
	"breed_name",
	"breed_slug",
	"municipality_name",
	"province_name",
	"region_name",
	"search_text",
	"search_vector",
	"location_point",
	"published_at",
	"ready_image_count",
	"has_cover_image",
	"like_count",
	"profile_type",
	"quality_score",
	"trust_score"
)
SELECT
	listing."id",
	listing."owner_user_id",
	listing."title",
	listing."description",
	breed."name",
	breed."slug",
	municipality."name",
	province."name",
	region."name",
	concat_ws(
		' ',
		listing."title",
		breed."name",
		municipality."name",
		province."name",
		region."name",
		listing."description"
	),
	setweight(to_tsvector('italian', unaccent(concat_ws(' ', listing."title", breed."name"))), 'A') ||
		setweight(to_tsvector('italian', unaccent(concat_ws(' ', municipality."name", province."name", region."name"))), 'B') ||
		setweight(to_tsvector('italian', unaccent(listing."description")), 'C'),
	listing."location_point",
	coalesce(listing."published_at", listing."updated_at", listing."created_at", now()),
	coalesce(ready_images."ready_image_count", 0),
	coalesce(cover_images."has_cover_image", false),
	coalesce(like_counts."like_count", 0),
	owner."profile_type",
	(
		CASE WHEN coalesce(ready_images."ready_image_count", 0) > 0 THEN 30 ELSE 0 END +
		CASE WHEN coalesce(cover_images."has_cover_image", false) THEN 20 ELSE 0 END +
		CASE WHEN length(listing."description") >= 300 THEN 15 ELSE 0 END +
		CASE WHEN listing."breed_id" IS NOT NULL THEN 5 ELSE 0 END +
		CASE WHEN listing."age_months_min" IS NOT NULL OR listing."age_months_max" IS NOT NULL THEN 10 ELSE 0 END +
		CASE WHEN listing."municipality_id" IS NOT NULL THEN 10 ELSE 0 END +
		CASE WHEN listing."is_vaccinated" IS NOT NULL THEN 3 ELSE 0 END +
		CASE WHEN listing."is_sterilized" IS NOT NULL THEN 3 ELSE 0 END +
		CASE WHEN listing."is_dewormed" IS NOT NULL THEN 2 ELSE 0 END +
		CASE WHEN listing."has_microchip" IS NOT NULL THEN 2 ELSE 0 END
	)::integer,
	least(
		100,
		CASE owner."profile_type"
			WHEN 'association' THEN 70
			WHEN 'shelter' THEN 70
			WHEN 'professional' THEN 55
			WHEN 'breeder' THEN 50
			ELSE 35
		END +
		CASE WHEN owner."email_verified_at" IS NOT NULL THEN 10 ELSE 0 END +
		CASE WHEN owner."phone_verified_at" IS NOT NULL THEN 10 ELSE 0 END
	)::integer
FROM "listings" listing
JOIN "users" owner ON owner."id" = listing."owner_user_id"
LEFT JOIN "cat_breeds" breed ON breed."id" = listing."breed_id"
LEFT JOIN "geo_municipalities" municipality ON municipality."id" = listing."municipality_id"
LEFT JOIN "geo_provinces" province ON province."id" = listing."province_id"
LEFT JOIN "geo_regions" region ON region."id" = listing."region_id"
LEFT JOIN ready_images ON ready_images."listing_id" = listing."id"
LEFT JOIN cover_images ON cover_images."listing_id" = listing."id"
LEFT JOIN like_counts ON like_counts."listing_id" = listing."id"
WHERE listing."moderation_status" = 'approved'
	AND listing."lifecycle_status" = 'published'
	AND listing."deleted_at" IS NULL
	AND owner."deleted_at" IS NULL
	AND (listing."expires_at" IS NULL OR listing."expires_at" > now());--> statement-breakpoint
CREATE INDEX "listing_search_documents_location_point_gix" ON "listing_search_documents" USING gist ("location_point");--> statement-breakpoint
CREATE INDEX "listing_search_documents_owner_user_idx" ON "listing_search_documents" USING btree ("owner_user_id");--> statement-breakpoint
CREATE INDEX "listing_search_documents_published_idx" ON "listing_search_documents" USING btree ("published_at","listing_id");--> statement-breakpoint
CREATE INDEX "listing_search_documents_quality_idx" ON "listing_search_documents" USING btree ("quality_score","trust_score");--> statement-breakpoint
CREATE INDEX "listing_search_documents_search_text_trgm_gin" ON "listing_search_documents" USING gin ("search_text" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "listing_search_documents_vector_gin" ON "listing_search_documents" USING gin ("search_vector");
