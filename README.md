# SmileMax

A personal web app for Singapore credit-card holders who want to **maximise air miles** on everyday spending. With a wallet of several cards — each with different bonus rates and monthly/quarterly/annual caps — it tracks your spend, computes cap usage in real time, and recommends the card that earns the highest **effective MPD (miles per dollar)** for your next purchase. It also doubles as a general expense tracker (cashback and cash/debit spend included).

> Rates and caps are a best-effort, manually maintained reference — always verify with your bank.

## Features

- **Cap-aware recommendation engine** — ranks your cards for a given category + amount, accounting for partially/fully exhausted caps, channel (contactless/online) bonuses, min-spend thresholds, selectable bonus categories, and per-card earn-block rounding.
- **Transactions** — log/edit with vendor + MCC lookup, live recommendations, group-bill splitting, favourites, monthly **recurring charges**, and **bank-statement reconciliation**.
- **Dashboard** — monthly stats, wallet cap bars (with "nearly maxed" nudges), upcoming vs recent transactions, and recurring "due to log" reminders.
- **Expenses** — breakdown by type/category/card, Recharts trends, CSV/Excel export.
- **Miles Balance & Earned** — track miles per programme (with UOB-style pooling), expiry warnings, a redemption goal, and per-cycle earnings.
- **Mile Value calculator** — redemption cents-per-mile, plus a "worth paying more to earn miles?" / break-even tool.
- **My Cards** — browse the card library, manage your wallet.
- Installable **PWA**, responsive (desktop sidebar + mobile bottom tab bar).

## Tech stack

- **React 18 + Vite + TypeScript**, Tailwind CSS
- **Supabase** — Postgres + Auth (email/password + Google OAuth) + Row-Level Security
- `react-router-dom`, `recharts`, `lucide-react`, `xlsx` (SheetJS), `date-fns`
- `vite-plugin-pwa` (offline app shell, auto-update service worker)
- **Vitest** for engine unit tests
- Deployed on **Cloudflare Pages**

## Prerequisites

- **Node 18+** and npm
- A **Supabase** project (free tier is fine)

## Quick start

```bash
git clone <repo-url>
cd milesmaximiser
npm install

# Configure environment
cp .env.example .env.local
# then edit .env.local with your Supabase URL + anon key

npm run dev          # http://localhost:5173
```

### Environment variables

Both are required (see [.env.example](.env.example)):

| Variable | Where to find it |
|---|---|
| `VITE_SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase → Project Settings → API → anon public key |

The anon key is safe to ship in the client (public by design; access is gated by RLS).

### Supabase setup

There is **no automated migration runner** — apply schema and seeds manually in the Supabase **SQL Editor**:

1. Run the migrations in `supabase/migrations/` **in numeric order** (`001_…` through `034_…`).
2. Seed the data:
   - `supabase/library_seed.sql` — the full 23-card SG library (run after all migrations)
   - `supabase/mcc_seed.sql` — MCC reference data
   - `supabase/vendor_seed.sql` — known SG vendors
3. **Auth** → enable Email and (optionally) Google OAuth providers.

> Admin access (the feedback inbox + export tools) is gated by a hardcoded email constant, `ADMIN_EMAIL`, in `src/components/Layout.tsx` and `src/pages/Admin.tsx` — change it to your own address.

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Vite dev server |
| `npm test` | Run the Vitest engine test suite once |
| `npm run test:watch` | Vitest in watch mode |
| `npm run build` | Type-check (`tsc -b`) + production build to `dist/` (copies `index.html` → `404.html` for SPA routing) |
| `npm run preview` | Preview the production build locally |

## Testing

`npm test` runs unit tests over the recommendation engine (`src/lib/recommendations.test.ts`) — cap tiers, block rounding, channel/wildcard rates, min-spend, ranking, and date boundaries. Add a test alongside any new cap/rate logic. Test files (`*.test.ts`) are excluded from the production build.

## Project structure

```
src/
  pages/        Route-level screens (Dashboard, Transactions, Expenses, Cards, Recommend,
                Miles, Earnings, MileValue, Admin, Onboarding, Login) — lazy-loaded
  components/   Shared UI (Layout, Modal, DatePicker, CapUsageBar, ErrorBoundary, …)
  context/      AuthContext, AppContext (all app data), ToastContext
  lib/          recommendations.ts (engine), types.ts, utils.ts, supabase.ts
supabase/
  migrations/   Ordered schema migrations (001–034)
  *_seed.sql    Card library, MCC, and vendor seed data
docs/           project-context.md, current-work.md, decision-log.md
```

See [docs/project-context.md](docs/project-context.md) for architecture, [docs/current-work.md](docs/current-work.md) for the build log, and [docs/decision-log.md](docs/decision-log.md) for key design decisions.

## Deployment

Cloudflare Pages (connected to the repo, auto-deploys on push to `main`):

- **Build command:** `npm run build`
- **Output directory:** `dist`
- SPA deep-link routing works because `postbuild` copies `index.html` to `dist/404.html`.

## Notes

- All date math uses local (SGT) `YYYY-MM-DD` boundaries — see the `isoDate()` convention in `src/lib/utils.ts`. Avoid `toISOString()` for calendar dates.
- The card library is read-only for users and admin-managed via SQL; there is no admin UI for editing rates/caps yet.
