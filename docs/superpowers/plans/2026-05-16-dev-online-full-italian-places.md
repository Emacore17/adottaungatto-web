# Dev Online Full Italian Places Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ensure dev-online has the complete active Italian places dataset before demo data is seeded, so developers can create listings and test filters for any Italian municipality.

**Architecture:** Add a worker-side `geo:verify` command that fails when active places are incomplete or duplicated. Update the dev deploy workflow to run verification first and only import/promote/boundaries when verification fails, then seed demo data against real places.

**Tech Stack:** pnpm 9, TypeScript, Vitest, worker geo import scripts, GitHub Actions, Azure Container Apps, PostgreSQL/PostGIS.

---

## File Structure

- Create `apps/worker/src/geo/verify-italian-places.ts`: queries active geo tables and evaluates completeness/duplicates.
- Create `apps/worker/src/geo/verify-italian-places-cli.ts`: CLI entrypoint for deploy jobs.
- Create `apps/worker/src/geo/verify-italian-places.spec.ts`: unit tests for completeness evaluation.
- Create `apps/worker/src/deploy/deploy-dev-workflow.spec.ts`: regression test that the deploy workflow ensures full places before demo seed.
- Modify `apps/worker/package.json`: add `geo:verify`.
- Modify `.github/workflows/deploy-dev.yml`: run `geo:verify`, then import/promote/boundaries only if needed.

## Task 1: Worker Geo Verification

- [ ] Write failing tests in `apps/worker/src/geo/verify-italian-places.spec.ts` for healthy counts, incomplete counts and duplicate active places.
- [ ] Run `pnpm --filter worker test -- src/geo/verify-italian-places.spec.ts` and confirm it fails because the module does not exist.
- [ ] Implement `evaluateItalianPlacesHealth`, `verifyItalianPlaces`, and the CLI.
- [ ] Add `geo:verify` to `apps/worker/package.json`.
- [ ] Re-run the worker geo verification test and confirm it passes.

## Task 2: Deploy Workflow Guard

- [ ] Write a failing test in `apps/worker/src/deploy/deploy-dev-workflow.spec.ts` asserting that `.github/workflows/deploy-dev.yml` has an `Ensure Italian places` step before `Seed demo data and assets`, and that it invokes `geo:verify`, `geo:import:apply`, `geo:promote:apply`, and `geo:boundaries:apply`.
- [ ] Run `pnpm --filter worker test -- src/deploy/deploy-dev-workflow.spec.ts` and confirm it fails because the workflow does not yet ensure places.
- [ ] Update `.github/workflows/deploy-dev.yml` to run verification before seed and import only when verification fails.
- [ ] Re-run the workflow guard test and confirm it passes.

## Task 3: Verification and Deploy

- [ ] Run `pnpm --filter worker test -- src/geo/verify-italian-places.spec.ts src/deploy/deploy-dev-workflow.spec.ts`.
- [ ] Run `pnpm --filter worker typecheck`.
- [ ] Run `pnpm --filter worker test`.
- [ ] Run `pnpm --filter worker build`.
- [ ] Commit and push to `develop`.
- [ ] Watch GitHub Actions `ci.yml` and `deploy-dev.yml`.
- [ ] Verify dev-online autocomplete finds representative places: `Napoli`, `Palermo`, `Aosta`, `Sicilia`.
- [ ] Verify no active duplicate place groups are reported by `geo:verify` in deploy logs.
