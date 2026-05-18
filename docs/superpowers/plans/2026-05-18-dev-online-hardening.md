# Dev Online Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep the dev online environment private, non-indexable, admin-capable, and deployable after Cloudflare Access protection.

**Architecture:** Separate runtime security from public search indexing with an explicit `SEARCH_INDEXING_ENABLED` flag. Trust both public and admin web origins for server actions. Keep Access service-token support isolated in deploy smoke and server-to-server API fetches so the browser never receives bypass credentials.

**Tech Stack:** Next.js 16, Vitest, Azure Container Apps, Cloudflare Access, GitHub Actions.

---

### Task 1: Admin Origin Trust

**Files:**

- Modify: `apps/web/lib/security/server-action-origin.ts`
- Test: `apps/web/lib/security/server-action-origin.spec.ts`

- [x] Write a failing test that `https://admin-dev.adottaungatto.it` is trusted when listed in `ADMIN_ALLOWED_HOSTS`.
- [x] Implement admin-host origin expansion alongside `TRUSTED_ACTION_ORIGINS`.
- [x] Run `pnpm --filter web test -- lib/security/server-action-origin.spec.ts`.

### Task 2: Search Indexing Gate

**Files:**

- Modify: `apps/web/lib/config/env.ts`
- Modify: `apps/web/app/robots.ts`
- Modify: `apps/web/app/sitemap.ts`
- Modify: `apps/web/lib/seo/metadata.ts`
- Modify: `apps/web/proxy.ts`
- Test: `apps/web/app/robots.spec.ts`
- Test: `apps/web/lib/seo/metadata.spec.ts`

- [x] Write failing tests for production runtime with `SEARCH_INDEXING_ENABLED=false`: robots disallows all, sitemap is empty, metadata emits `noindex`.
- [x] Add `searchIndexingEnabled` to web env, defaulting to `true` only for production runtime.
- [x] Add `X-Robots-Tag: noindex, nofollow, noarchive` to dev responses when indexing is disabled.
- [x] Run focused web tests.

### Task 3: Access-Aware Runtime Fetch And Smoke

**Files:**

- Modify: `apps/web/lib/config/env.ts`
- Modify: `apps/web/lib/api/client.ts`
- Modify: `apps/web/lib/api/cloudflare-access.ts`
- Modify: `apps/web/app/api/notifications/stream/route.ts`
- Modify: `scripts/deploy/remote-smoke.mjs`
- Test: `apps/web/lib/api/client.spec.ts`

- [x] Write a failing API client test proving server fetches include Cloudflare Access service-token headers only when env vars are present.
- [x] Write a failing remote smoke check by inspection in `apps/worker/src/deploy/deploy-dev-workflow.spec.ts`.
- [x] Add optional service-token headers to server API fetches and remote smoke fetches.
- [x] Ensure browser-side public env never includes the Access client secret.

### Task 4: Deploy Workflow Hardening

**Files:**

- Modify: `.github/workflows/deploy-dev.yml`
- Modify: `turbo.json`
- Modify: `.env.example`
- Modify: `.env.production.example`
- Test: `apps/worker/src/deploy/deploy-dev-workflow.spec.ts`

- [x] Add dev env vars `SEARCH_INDEXING_ENABLED=false`, `TRUSTED_ACTION_ORIGINS`, and optional Cloudflare Access service-token secrets to deploy.
- [x] Preserve `api-dev` access strategy until token creation is approved.
- [x] Run worker deploy workflow tests and web tests.

### Task 5: Runtime Changes

**External changes:**

- Update Azure web env immediately with `TRUSTED_ACTION_ORIGINS=https://dev.adottaungatto.it,https://admin-dev.adottaungatto.it`.
- After explicit confirmation, create a Cloudflare Access service token and save it only as GitHub/Azure secrets.
- If service token is created, add `api-dev.adottaungatto.it` to the Access app and restrict the API origin to Cloudflare IP ranges.

- [x] Update Azure web env immediately with `TRUSTED_ACTION_ORIGINS=https://dev.adottaungatto.it,https://admin-dev.adottaungatto.it`.
- [x] Verify unauthenticated `dev` and `admin-dev` still redirect to Cloudflare Access.
- [x] Verify direct Azure web origin remains `403`.
- [ ] Verify `admin-dev` login no longer logs `Untrusted request origin` after a real Access-authenticated login attempt.
- [x] After explicit confirmation, create a Cloudflare Access service token and save it only as GitHub/Azure secrets.
- [x] If service token is created, add `api-dev.adottaungatto.it` to the Access app and restrict the API origin to Cloudflare IP ranges.
- [x] Verify deploy smoke can pass through Access when service-token secrets exist.
