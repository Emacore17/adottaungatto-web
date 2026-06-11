# Dev Online Listing Experience Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add blur placeholders, classic listing pagination, suggestion results, and production cold-start documentation for the dev-online listing experience.

**Architecture:** Store a real base64 `blurDataUrl` beside listing image metadata, generate it in the worker, expose it through API/web types, and pass it into `next/image`. Keep public listing results exact in `items`/`meta`, and add separate `suggestions` for alternative listings. Render pagination server-side through stable `/listings?page=N` URLs.

**Tech Stack:** pnpm 9, TypeScript, Next.js App Router, NestJS, PostgreSQL/Drizzle, sharp, Vitest, Azure Container Apps docs.

---

## File Structure

- `packages/db/src/schema.ts`: add `listingImages.blurDataUrl`.
- `packages/db/drizzle/0022_listing_image_blur_data_url.sql`: add nullable DB column.
- `packages/db/drizzle/meta/_journal.json` and latest snapshot: keep Drizzle migration metadata consistent if `pnpm db:generate` updates it.
- `apps/worker/src/media/process-listing-images.ts`: generate and persist WebP data URL placeholders.
- `apps/worker/src/media/process-listing-images.spec.ts`: prove worker returns a valid blur data URL.
- `packages/db/src/seed-demo.ts`: seed demo listing images with deterministic blur data URLs.
- `apps/api/src/listings/listings.types.ts`: expose `blurDataUrl` and `suggestions`.
- `apps/api/src/listings/listings.service.ts`: select/map `blur_data_url`, calculate listing suggestions, and keep exact result metadata separate.
- `apps/api/src/listings/listings.service.spec.ts`: prove API mapping and suggestions behavior.
- `apps/web/lib/api/types.ts`: mirror API `blurDataUrl` and `suggestions` contracts.
- `apps/web/components/shared/storage-image.tsx`: use `placeholder="blur"` when a blur data URL exists.
- `apps/web/app/(public)/_components/listing-image-preview.tsx`: carry blur data URL through preview images.
- `apps/web/app/(public)/_components/listing-card.tsx`: include blur data URL in card image data.
- `apps/web/app/(public)/_components/nearby-listings-section.tsx`: use blur data URL for nearby cards.
- `apps/web/app/(public)/listings/page.tsx`: render classic pagination and suggestions.
- `docs/deploy-strategy.md`: document min replica rule for production web/API.

## Task 1: Worker Blur Data URL

**Files:**
- Modify: `apps/worker/src/media/process-listing-images.spec.ts`
- Modify: `apps/worker/src/media/process-listing-images.ts`

- [ ] **Step 1: Write the failing worker test**

Add this assertion to the existing `validates images and creates large and thumb webp variants` test:

```ts
expect(processed.blurDataUrl).toMatch(/^data:image\/webp;base64,[A-Za-z0-9+/=]+$/)
expect(Buffer.from(processed.blurDataUrl.split(",")[1] ?? "", "base64").byteLength).toBeGreaterThan(0)
```

- [ ] **Step 2: Run the worker test red**

Run: `pnpm --filter worker test -- src/media/process-listing-images.spec.ts`

Expected: fail because `blurDataUrl` does not exist on `ProcessedImage`.

- [ ] **Step 3: Implement minimal worker support**

Update `ProcessedImage`:

```ts
type ProcessedImage = {
  large: Buffer
  thumb: Buffer
  blurDataUrl: string
  width: number
  height: number
}
```

Add helper:

```ts
async function createBlurDataUrl(image: sharp.Sharp) {
  const buffer = await image
    .clone()
    .resize({ width: 16, height: 16, fit: "cover" })
    .blur(4)
    .webp({ quality: 45 })
    .toBuffer()

  return `data:image/webp;base64,${buffer.toString("base64")}`
}
```

Return `blurDataUrl` from `processImageBuffer`.

- [ ] **Step 4: Run the worker test green**

Run: `pnpm --filter worker test -- src/media/process-listing-images.spec.ts`

Expected: pass.

## Task 2: Database Column and Persistence

**Files:**
- Modify: `packages/db/src/schema.ts`
- Create: `packages/db/drizzle/0022_listing_image_blur_data_url.sql`
- Modify: `packages/db/drizzle/meta/_journal.json`
- Modify: `apps/worker/src/media/process-listing-images.ts`
- Modify: `packages/db/src/seed-demo.ts`

- [ ] **Step 1: Add schema field**

Add to `listingImages`:

```ts
blurDataUrl: text("blur_data_url"),
```

- [ ] **Step 2: Generate migration**

Run: `pnpm db:generate`

Expected: a new SQL migration containing:

```sql
ALTER TABLE "listing_images" ADD COLUMN "blur_data_url" text;
```

- [ ] **Step 3: Persist blur data URL in worker**

Add `blur_data_url = $6` to the ready image update and pass `processed.blurDataUrl` after height:

```sql
blur_data_url = $6,
status = 'ready',
```

```ts
[
  image.id,
  largeObjectKey,
  thumbObjectKey,
  processed.width,
  processed.height,
  processed.blurDataUrl,
]
```

- [ ] **Step 4: Seed deterministic demo blur data**

In `seedListingImagesSql`, include `blur_data_url` and use a small valid constant:

```ts
const demoBlurDataUrl =
  "data:image/webp;base64,UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AA/vuUAAA="
```

Every inserted demo image row should receive `${sqlString(demoBlurDataUrl)}` in the `blur_data_url` column.

- [ ] **Step 5: Verify database package**

Run: `pnpm --filter @workspace/db typecheck`

Expected: pass.

## Task 3: API Image Mapping

**Files:**
- Modify: `apps/api/src/listings/listings.types.ts`
- Modify: `apps/api/src/listings/listings.service.ts`
- Modify: `apps/api/src/listings/listings.service.spec.ts`

- [ ] **Step 1: Write failing API mapping expectations**

Update the public listing test fixture to include `cover_blur_data_url: "data:image/webp;base64,AAAA"` and preview JSON field `blur_data_url`. Expect `blurDataUrl` on cover and preview images.

- [ ] **Step 2: Run API test red**

Run: `pnpm --filter api test -- src/listings/listings.service.spec.ts`

Expected: fail because `blurDataUrl` is absent.

- [ ] **Step 3: Implement API mapping**

Add `blurDataUrl: string | null` to `ListingImage` and `PublicListingImage`. Add `cover_blur_data_url` and preview `blur_data_url` to SQL selection and row types. Map them with:

```ts
blurDataUrl: row.cover_blur_data_url,
```

and:

```ts
blurDataUrl: readNullableString(item.blur_data_url),
```

- [ ] **Step 4: Run API mapping green**

Run: `pnpm --filter api test -- src/listings/listings.service.spec.ts`

Expected: pass for the mapping assertions.

## Task 4: API Suggestions

**Files:**
- Modify: `apps/api/src/listings/listings.types.ts`
- Modify: `apps/api/src/listings/listings.service.ts`
- Modify: `apps/api/src/listings/listings.service.spec.ts`

- [ ] **Step 1: Write failing suggestion tests**

Add tests for:

```ts
expect(result.suggestions).toMatchObject({
  title: "Potrebbero interessarti anche",
  reason: "not_enough_results",
  items: [{ id: "suggestion-id" }],
})
```

and:

```ts
expect(result.suggestions).toBeNull()
```

for a database response with no public listings at all.

- [ ] **Step 2: Run API suggestion tests red**

Run: `pnpm --filter api test -- src/listings/listings.service.spec.ts`

Expected: fail because `suggestions` is missing.

- [ ] **Step 3: Implement suggestions contract**

Add types:

```ts
export type PublicListingSuggestions = {
  title: "Potrebbero interessarti anche"
  reason: "empty_exact" | "end_of_results" | "not_enough_results"
  items: PublicListingSummary[]
}
```

Add `suggestions: PublicListingSuggestions | null` to `PublicListingListResponse`.

Add suggestion SQL that reuses `publicListingSuggestionOrderSql`, excludes current row ids with `listing.id <> all($23::uuid[])`, and limits to the number needed to fill the page.

Derive reason:

```ts
function resolveSuggestionReason(query: ListingPublicListQuery, exactTotal: number, exactCount: number) {
  if (exactTotal === 0 && query.page === 1) return "empty_exact"
  if (query.page > Math.max(Math.ceil(exactTotal / query.pageSize), 1)) return "end_of_results"
  if (exactCount < query.pageSize) return "not_enough_results"
  return null
}
```

- [ ] **Step 4: Run API suggestions green**

Run: `pnpm --filter api test -- src/listings/listings.service.spec.ts`

Expected: pass.

## Task 5: Web Blur Images

**Files:**
- Modify: `apps/web/lib/api/types.ts`
- Modify: `apps/web/components/shared/storage-image.tsx`
- Modify: `apps/web/app/(public)/_components/listing-image-preview.tsx`
- Modify: `apps/web/app/(public)/_components/listing-card.tsx`
- Modify: `apps/web/app/(public)/_components/nearby-listings-section.tsx`

- [ ] **Step 1: Update web image types**

Add:

```ts
blurDataUrl: string | null
```

to `PublicListingImage`.

- [ ] **Step 2: Support blur in `StorageImage`**

Add optional prop:

```ts
blurDataUrl?: string | null
```

Pass to `Image`:

```tsx
placeholder={blurDataUrl ? "blur" : props.placeholder}
blurDataURL={blurDataUrl ?? props.blurDataURL}
```

- [ ] **Step 3: Carry blur data through listing previews**

Add `blurDataUrl` to `ListingPreviewImage` and set it from `image.blurDataUrl` in `createPreviewImage`.

- [ ] **Step 4: Use blur data in image components**

Pass `blurDataUrl={image.blurDataUrl}` from listing preview and nearby listing card `StorageImage` usage.

- [ ] **Step 5: Verify web typecheck**

Run: `pnpm --filter web typecheck`

Expected: pass.

## Task 6: Web Pagination and Suggestions

**Files:**
- Modify: `apps/web/app/(public)/listings/page.tsx`

- [ ] **Step 1: Add pagination helper**

Add helper that preserves listing query params and changes only `page`:

```ts
function createListingsPagePath(
  query: ReturnType<typeof parseListingSearchParams>["query"],
  page: number,
  placeLabel: string | null,
  placeType: PlaceAutocompleteType | "position" | null
) {
  return routes.listings({
    ...query,
    page,
    placeLabel: placeLabel ?? undefined,
    placeType: placeType ?? undefined,
  })
}
```

- [ ] **Step 2: Render pagination footer**

Render when `meta && meta.totalPages > 1`:

```tsx
<PaginationFooter
  page={meta.page}
  totalPages={meta.totalPages}
  previousHref={createListingsPagePath(parsed.query, meta.page - 1, placeLabel, placeType)}
  nextHref={createListingsPagePath(parsed.query, meta.page + 1, placeLabel, placeType)}
/>
```

- [ ] **Step 3: Render suggestions separately**

When `listings.ok && listings.data.suggestions?.items.length`, render a second section headed `Potrebbero interessarti anche` using `ListingCard`. Fetch favorite ids for both exact and suggestion ids.

- [ ] **Step 4: Verify web build path**

Run: `pnpm --filter web typecheck`

Expected: pass.

## Task 7: Cold Start Documentation

**Files:**
- Modify: `docs/deploy-strategy.md`

- [ ] **Step 1: Add production min replica note**

In the Container Apps or production section, add:

```md
Produzione non deve usare `minReplicas=0` per `web` e `api`: almeno una replica deve restare calda per evitare cold start percepibili dagli utenti. `dev-online` puo' restare a zero repliche minime per contenere i costi.
```

- [ ] **Step 2: Verify docs diff**

Run: `git diff --check`

Expected: pass.

## Task 8: Final Verification

**Files:**
- Modify: all touched files

- [ ] **Step 1: Run focused tests**

Run:

```powershell
pnpm --filter worker test -- src/media/process-listing-images.spec.ts
pnpm --filter api test -- src/listings/listings.service.spec.ts
pnpm --filter web typecheck
pnpm --filter @workspace/db typecheck
```

Expected: all pass.

- [ ] **Step 2: Run release check**

Run: `pnpm release:check`

Expected: pass.

- [ ] **Step 3: Commit implementation**

Run:

```powershell
git add .
git commit -m "feat: improve listing experience"
```

Expected: one implementation commit after the design and plan commits.
