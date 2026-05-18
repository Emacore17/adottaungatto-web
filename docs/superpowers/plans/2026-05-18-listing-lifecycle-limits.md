# Listing Lifecycle Limits Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add account-level active listing limits and automated lifecycle cleanup for stale drafts and expired published listings.

**Architecture:** Keep account limit decisions in the API listing service, using a small policy helper driven by env defaults. Keep lifecycle cleanup in the worker as an idempotent batch job that updates listing state and removes stale search documents.

**Tech Stack:** NestJS API, Next.js server actions, PostgreSQL SQL, worker TypeScript scripts, Vitest.

---

### Task 1: Listing Policy Configuration

**Files:**
- Modify: `apps/api/src/config/env.ts`
- Modify: `apps/worker/src/config/env.ts`
- Create: `packages/domain/src/listing-lifecycle.ts`

- [ ] Add shared constants and helpers:

```ts
export const defaultListingLifecyclePolicy = {
  defaultActiveLimit: 5,
  organizationActiveLimit: 50,
  publishedTtlDays: 60,
  staleDraftTtlDays: 30,
  retainTerminalDays: 180,
  cleanupIntervalSeconds: 3600,
  cleanupBatchSize: 100,
} as const

export function getActiveListingLimit(profileType: string, policy = defaultListingLifecyclePolicy) {
  return profileType === "association" || profileType === "shelter"
    ? policy.organizationActiveLimit
    : policy.defaultActiveLimit
}
```

- [ ] Add API env values: `LISTING_LIMIT_DEFAULT_ACTIVE`, `LISTING_LIMIT_ORGANIZATION_ACTIVE`, `LISTING_PUBLISHED_TTL_DAYS`.
- [ ] Add worker env values: `LISTING_STALE_DRAFT_TTL_DAYS`, `LISTING_RETAIN_TERMINAL_DAYS`, `LISTING_LIFECYCLE_CLEANUP_INTERVAL_SECONDS`, `LISTING_LIFECYCLE_CLEANUP_BATCH_SIZE`.

### Task 2: API Account Limits and Published Expiry

**Files:**
- Modify: `apps/api/src/listings/listings.service.spec.ts`
- Modify: `apps/api/src/listings/listings.service.ts`
- Modify: `apps/api/src/moderation/moderation.service.spec.ts`
- Modify: `apps/api/src/moderation/moderation.service.ts`

- [ ] Write failing test: creating a draft fails with `ConflictException` reason `listing_account_limit_reached` when active listings are at the profile limit.
- [ ] Write failing test: creating a draft succeeds when active listings are below the limit.
- [ ] Implement active listing count SQL before `createUserDraftSql`.
- [ ] Write failing test: approving a listing sets `expires_at` when it is missing.
- [ ] Implement approval `expires_at = coalesce(expires_at, now() + ($11::int * interval '1 day'))`.

### Task 3: Web Error Mapping

**Files:**
- Modify: `apps/web/app/(account)/account/actions.ts`
- Modify: `apps/web/app/(account)/account/listings/drafts/_components/draft-action-message.tsx`

- [ ] Map API `reason === "listing_account_limit_reached"` to `?error=listing-limit`.
- [ ] Show a clear message that drafts, review items, and published listings count toward the limit.

### Task 4: Worker Lifecycle Cleanup

**Files:**
- Create: `apps/worker/src/listings/listing-lifecycle-cleanup.ts`
- Create: `apps/worker/src/listings/listing-lifecycle-cleanup.spec.ts`
- Modify: `apps/worker/src/main.ts`

- [ ] Write failing test: stale editable listings are soft-deleted with `lifecycle_status = 'deleted'` and `deleted_at = now()`.
- [ ] Write failing test: expired published listings are marked `expired` and corresponding search documents are deleted.
- [ ] Implement batch SQL with configurable TTL and batch size.
- [ ] Start cleanup loop in `main.ts` alongside media processing.

### Task 5: Docs and Verification

**Files:**
- Modify: `docs/data-model.md`
- Modify: `docs/moderation.md`
- Modify: `docs/production-readiness.md`

- [ ] Document lifecycle policy, limits, and env values.
- [ ] Run targeted API and worker tests.
- [ ] Run `pnpm release:check`.
- [ ] Commit, push, and deploy dev with `deploy-dev.yml`.
