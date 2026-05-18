# Moderation Reporting Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix unclear moderation decision failures, add moderator-facing identifiers and activity pagination, and expose safe listing reports from the detail page.

**Architecture:** Keep moderation ownership checks in the API service, with an explicit admin override flag passed by the controller from authenticated roles. Keep web actions thin: validate form data, call API clients, redirect with typed status params. Reuse the existing moderation queue/activity API and report API instead of adding new data models.

**Tech Stack:** NestJS API, Next.js App Router server actions, PostgreSQL SQL CTEs, shadcn/ui components, Vitest.

---

### Task 1: Moderation Decision Assignment Semantics

**Files:**
- Modify: `apps/api/src/moderation/moderation.service.ts`
- Modify: `apps/api/src/moderation/moderation.controller.ts`
- Modify: `apps/api/src/moderation/moderation.service.spec.ts`
- Modify: `apps/api/src/moderation/moderation.controller.spec.ts`

- [ ] Add failing tests for moderator conflict and admin override.
- [ ] Run `pnpm --filter api test -- src/moderation/moderation.service.spec.ts src/moderation/moderation.controller.spec.ts` and confirm the new tests fail.
- [ ] Add `canOverrideAssignment` to `decideListingCase`, pass it from controller when user roles include `admin`, and record override metadata.
- [ ] Re-run the moderation tests and confirm they pass.

### Task 2: Queue Identifiers And Feedback

**Files:**
- Modify: `apps/api/src/moderation/moderation.service.ts`
- Modify: `apps/api/src/moderation/moderation.types.ts`
- Modify: `apps/web/lib/api/moderation.ts`
- Modify: `apps/web/app/(admin)/moderation/actions.ts`
- Modify: `apps/web/app/(admin)/moderation/_components/moderation-queue-table.tsx`
- Modify: `apps/web/app/(admin)/moderation/page.tsx`
- Modify: `apps/web/app/(admin)/moderation/queue/page.tsx`

- [ ] Add failing mapper/type tests or extend existing expectations for assigned operator details.
- [ ] Surface listing UUID and case UUID in queue rows/cards.
- [ ] Track listing IDs through decision forms so errors can identify affected listings.
- [ ] Map assignment conflict and stale case errors to human-readable Italian messages.

### Task 3: Paginated Activity View

**Files:**
- Modify: `apps/web/lib/routes.ts`
- Create: `apps/web/app/(admin)/moderation/activity/page.tsx`
- Modify: `apps/web/app/(admin)/moderation/page.tsx`

- [ ] Create `/moderation/activity` using `listRecentModerationActions` with pagination.
- [ ] Show action, listing UUID, case UUID, listing title, actor, owner, status, reason, and timestamp.
- [ ] Link to the full activity view from the moderation dashboard.

### Task 4: Listing Report Entry Point And Rate Limits

**Files:**
- Create: `apps/api/src/reports/reports-rate-limit.ts`
- Modify: `apps/api/src/reports/reports.controller.ts`
- Modify: `apps/api/src/reports/reports.controller.spec.ts`
- Modify: `apps/web/lib/api/reports.ts`
- Modify: `apps/web/app/(public)/listings/[id]/actions.ts`
- Create: `apps/web/app/(public)/listings/[id]/_components/listing-report-card.tsx`
- Modify: `apps/web/app/(public)/listings/[id]/page.tsx`

- [ ] Add failing report controller test for rate-limit rule enforcement.
- [ ] Add report rate-limit rules by IP, user, and listing.
- [ ] Add web API client and server action for listing reports.
- [ ] Add detail-page report UI with reason select, description, login redirect, and status feedback.

### Task 5: Verification

**Files:**
- Modify docs if behavior descriptions drift from `docs/moderation.md` or `docs/authz.md`.

- [ ] Run API moderation/report tests.
- [ ] Run web lint, typecheck, tests, and build.
- [ ] Run API typecheck/tests for changed modules.
- [ ] Check git diff and commit.
