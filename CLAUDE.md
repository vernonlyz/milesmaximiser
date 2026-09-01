# CLAUDE.md

Working notes for Claude Code on **MilesMaximiser / SmileMax** — a Singapore credit-card air-miles tracker.

## What this app is

A React 18 + Vite 5 + TypeScript SPA over Supabase (Postgres + Auth + RLS), deployed on Cloudflare Pages (PWA). It helps a user pick the best card per transaction (a cap-aware recommendation engine), log spend, and track miles balances/earnings. One admin user (`vernonlyz@gmail.com`) manages the shared card library.

## Commands

- **Build:** `npm run build` (`tsc -b && vite build`). Always run before committing a code change.
- **Test:** `npm test` (Vitest — engine unit tests in `src/lib/recommendations.test.ts`). `vitest` is pinned to `^2` for vite-5 single-esbuild compatibility; do not bump it without checking the Cloudflare `npm ci` build.
- **Deploy:** `npm run deploy` (build + wrangler). Deploys are usually the user's call.

## Golden rules

- **Discuss before implementing.** Standing instruction from the user: propose the plan/suggestions and get a nod before writing code. Small, obviously-in-scope fixes the user just asked for are fine to build directly.
- **Never `git add -A`.** Stage only the files you touched, by path.
- **Commit trailer** (every commit): `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
- **Commit / push / tag only when asked.** The user drives cadence. When shipping, the pattern is: build → `git add <paths>` → commit → `git tag vX.Y-slug` → `git push && git push --tags`. Tags are `v8.x`-style semantic-ish (e.g. `v8.12-fix-edit-mpd`, `v8.13-citi-rewards-mcc`, `v8.11-stable` for doc/stable checkpoints).
- **Update the docs** when the user asks (they often do after a feature): `docs/current-work.md` (timeline + Completed), `docs/decision-log.md` (why, for non-trivial calls), `docs/project-context.md` (architecture/tables/migrations). Keep the migration list current.
- **Never guess bank data.** MCC lists, rates, caps are seeded from published sources; where a bank publishes categories not codes, use standard MCCs and flag them as indicative. Prefer skipping over inventing.
- Platform is **Windows / PowerShell**; a Bash tool is also available. Git warns `LF will be replaced by CRLF` — harmless.

## Migrations (IMPORTANT: manual)

- SQL migrations in `supabase/migrations/NNN_*.sql` are **applied by hand in the Supabase SQL Editor** — there is no automated runner. After adding one, tell the user to run it.
- Current latest: **080**. Number the next one 081+.
- Write migrations **idempotent** (e.g. `ON CONFLICT DO NOTHING`, or scoped delete-then-insert) so re-running is safe.
- `supabase/library_seed.sql`, `mcc_seed.sql`, `vendor_seed.sql` are the **canonical** data for fresh installs. When a migration changes library/MCC/vendor data, **mirror the change into the seed** — otherwise a clean DB won't get it. (A recurring past bug: data migrations that key off card *name* run before `library_seed` inserts the cards on a fresh DB and silently no-op.)
- **`vendor_seed.sql` is generated, not hand-maintained.** It's the export output of the Admin Vendors→MCC editor's "Copy vendor_seed SQL" button (4-col: name, default_mcc, default_category_id, mcc_confidence; alphabetized; `ON CONFLICT (name) DO UPDATE`). Curate vendors in the Admin UI against the live DB, then re-export and commit. Don't hand-edit it — edits get overwritten on the next export and never reach the live DB.

## Architecture cheat-sheet

- **Engine:** `src/lib/recommendations.ts` — `recommendCards`, `calcMiles`, `buildPeriodSpending` (cap usage from the transactions array), plus effective-date resolvers, `applyRateBoosts`/`applyCapBoosts`, `applySelectableOverride`. Effective-dated rates/caps (`effective_from`) resolve the correct slice per transaction date. Caller must exclude a transaction being **edited** from the array it passes, or its own spend is double-counted against the cap.
- **MCC eligibility:** `src/lib/mcc.ts` — `resolveMccEligibility(card, mcc, rows, channel?, chosenLabels?)` over `card_library.mcc_mode` (`whitelist`|`blacklist`|`hybrid`|null) + `card_mcc_eligibility` rows (+ `bonus_channel`, `always_eligible`, `reduced`). Still **level 1 / informational** — it drives hints only; the engine's ranked MPD and logged miles do not consume it yet (Level 2 deferred).
- **Data flow:** `src/context/AppContext.tsx` loads cards/rates/caps/overrides/transactions/statementDays; pages read via `useApp()`. Auth via `src/context/AuthContext.tsx` (`ADMIN_EMAIL` gates admin UI; RLS enforces per-user `auth.uid() = user_id` and admin-write `auth.email() = '...'`).
- **Types:** `src/lib/types.ts` is the source of truth for row shapes — update it alongside schema changes.
- **Charts:** Recharts, lazy-loaded per route.
- **Docs:** `docs/{project-context,current-work,decision-log}.md` are the durable project record; `README.md` is user-facing onboarding.
