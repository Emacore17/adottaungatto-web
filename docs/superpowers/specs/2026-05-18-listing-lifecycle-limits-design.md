# Listing Lifecycle and Account Limits Design

## Goal

Keep listings fresh, reduce stale storage usage, and prevent one account from accumulating too many active listings, including drafts.

## Approved Policy

- Private, breeder, and professional accounts may keep up to 5 active listings.
- Association and shelter accounts may keep up to 50 active listings.
- Active listings include `draft`, `pending_review`, and `published` listings that are not deleted, expired, or adopted.
- Draft and pending-review listings that have not been updated for 30 days are soft-deleted.
- Published listings expire 60 days after publication.
- Expired and deleted listings remain in the database for 180 days for audit and recovery, then become eligible for hard cleanup.

## Lifecycle Behavior

The existing `listings.lifecycle_status` and `listings.expires_at` fields remain the source of truth. Public listing queries already hide rows where `expires_at <= now()`, and the new worker cleanup makes that state explicit by setting `lifecycle_status = 'expired'`.

When moderation approves a listing, the API sets:

- `moderation_status = 'approved'`
- `lifecycle_status = 'published'`
- `published_at = coalesce(published_at, now())`
- `expires_at = coalesce(expires_at, now() + interval '60 days')`

When a published listing reaches `expires_at`, the worker sets:

- `lifecycle_status = 'expired'`
- `updated_at = now()`

After expiring a listing, the worker refreshes or removes its search document so stale listings do not remain discoverable through indexed search.

## Account Limit Behavior

Before creating a new draft, the API counts the owner account's active listings. If the count is already at the profile limit, draft creation fails with HTTP 409 and reason `listing_account_limit_reached`.

The API response includes:

- `reason`
- `limit`
- `activeCount`

The web create action maps this to `?error=listing-limit`, and the draft form explains that drafts, listings in review, and published listings all count.

## Cleanup Strategy

The worker runs lifecycle cleanup on an interval alongside media processing. The cleanup is idempotent and batch-limited:

1. Soft-delete stale editable listings where `lifecycle_status = 'draft'`, `moderation_status in ('draft', 'pending_review')`, `deleted_at is null`, and `updated_at < now() - interval '30 days'`.
2. Expire published listings where `lifecycle_status = 'published'`, `moderation_status = 'approved'`, `deleted_at is null`, and `expires_at <= now()`.
3. Delete search documents for rows that are no longer public.
4. Report counts for observability logs.

Physical data and object-storage cleanup is intentionally separate. It should run only for rows already soft-deleted or expired for more than 180 days, and it must respect moderation audit requirements.

## Configuration

Use environment variables with conservative defaults:

- `LISTING_LIMIT_DEFAULT_ACTIVE=5`
- `LISTING_LIMIT_ORGANIZATION_ACTIVE=50`
- `LISTING_PUBLISHED_TTL_DAYS=60`
- `LISTING_STALE_DRAFT_TTL_DAYS=30`
- `LISTING_RETAIN_TERMINAL_DAYS=180`
- `LISTING_LIFECYCLE_CLEANUP_INTERVAL_SECONDS=3600`
- `LISTING_LIFECYCLE_CLEANUP_BATCH_SIZE=100`

## Testing

- API service tests cover the account limit check, successful creation under the limit, and approval setting `expires_at`.
- API controller/action tests cover the error mapping where useful.
- Worker tests cover stale draft deletion, published listing expiration, and search document cleanup.
- Release verification runs API tests, worker tests, lint, typecheck, build, and the full release check before deploy.
