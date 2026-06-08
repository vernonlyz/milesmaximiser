# MilesMaximiser — Project Context

## 1. Project Purpose

MilesMaximiser is a personal web app for Singapore credit card holders who want to maximise air miles earned on everyday spending. The core problem it solves: with a wallet of several cards, each offering different bonus rates and monthly/quarterly/annual spend caps, it is non-trivial to know which card to use for a given purchase at any point in time.

The app tracks all card spend, computes cap usage in real time, and recommends the card that will yield the highest **effective MPD (miles per dollar)** for the next transaction — accounting for caps that have been partially or fully exhausted.

**Target user:** A single Singapore resident with a small wallet (5–15 cards) who already understands miles earning but wants tooling to stop leaving miles on the table.

---

## 2. Architecture

```
Browser (React + Vite + TypeScript)
    │
    ├─ AuthContext         — Supabase Auth (email/password + Google OAuth)
    ├─ AppContext          — All app data; loaded at login; derived wallet state
    │
    ├─ pages/             — Route-level components (Dashboard, Cards, Recommend, Transactions, Onboarding, Login)
    ├─ components/        — Shared UI (Layout, Modal, CapUsageBar, StatusBadge, ProtectedRoute)
    └─ lib/
        ├─ recommendations.ts  — Core cap-aware recommendation engine
        ├─ types.ts            — All TypeScript interfaces
        ├─ utils.ts            — Formatting, date helpers, constants
        ├─ supabase.ts         — Supabase client
        └─ starterCards.ts     — Default card data for onboarding seed

Supabase (Postgres + Auth + RLS)
    ├─ card_library                   — Admin-managed list of SG credit cards
    ├─ library_rates                  — Bonus MPD per (card, category, effective_from)
    ├─ library_caps                   — Spending caps per (card, category, period, effective_from)
    ├─ library_selectable_categories  — Valid bonus-category choices per selectable card
    ├─ user_card_selections           — Per-user wallet (join table)
    ├─ user_category_overrides        — Per-user chosen bonus category for selectable cards
    ├─ transactions                   — Per-user transaction log
    └─ categories                     — Shared lookup table (includes Fashion, Beauty)

Deployment: Cloudflare Pages (static hosting; env vars injected at build)
```

**Data flow at login:**
1. Supabase Auth resolves the session.
2. `AppContext` fires three parallel loads: full card library (cards + rates + caps + categories), user's wallet selections, and current-year transactions.
3. Everything lives in React state for the session; no client-side cache or service worker.
4. The recommendation engine runs entirely in the browser against this in-memory data.

**Key design decisions:**
- All data loaded upfront — dataset is small enough that lazy loading adds complexity without benefit.
- Card library is read-only for users; only an admin can update rates/caps. This avoids per-user drift in card metadata.
- Effective-date versioning (`effective_from`) on rates and caps allows historic accuracy without deleting old records. The engine resolves the row with the latest `effective_from ≤ today`.
- Cap usage is computed client-side from the transaction log (`buildPeriodSpending` in `recommendations.ts`) rather than stored, so it is always consistent.

---

## 3. Key Files

| File | Purpose |
|---|---|
| [src/lib/recommendations.ts](../src/lib/recommendations.ts) | Core engine — cap resolution, period spend aggregation, effective MPD calculation, card ranking |
| [src/context/AppContext.tsx](../src/context/AppContext.tsx) | Global state — library load, wallet selection, transaction list, derived `cards` array |
| [src/context/AuthContext.tsx](../src/context/AuthContext.tsx) | Supabase Auth session management |
| [src/lib/types.ts](../src/lib/types.ts) | All shared TypeScript interfaces |
| [src/lib/utils.ts](../src/lib/utils.ts) | `getPeriodStart()`, formatting helpers, constants |
| [src/lib/starterCards.ts](../src/lib/starterCards.ts) | Default 14 SG cards used during onboarding |
| [src/pages/Dashboard.tsx](../src/pages/Dashboard.tsx) | Monthly stats, wallet cap bars, recent transactions |
| [src/pages/Transactions.tsx](../src/pages/Transactions.tsx) | Transaction log, add modal with live recommendations |
| [src/pages/Recommend.tsx](../src/pages/Recommend.tsx) | Ad-hoc card recommender for a given category + amount |
| [src/pages/Cards.tsx](../src/pages/Cards.tsx) | Library browser; add/remove cards from wallet |
| [src/pages/Onboarding.tsx](../src/pages/Onboarding.tsx) | First-run card selection flow |
| [supabase/migrations/004_library_model.sql](../supabase/migrations/004_library_model.sql) | Library + user_card_selections schema |
| [supabase/migrations/005_selectable_categories.sql](../supabase/migrations/005_selectable_categories.sql) | Per-user selectable bonus category schema and seed |
| [supabase/library_seed.sql](../supabase/library_seed.sql) | 14-card SG library seed (run after migration 004) |

---

## 4. Current Implementation Status

The app is a functional MVP. All core features are implemented:

| Feature | Status |
|---|---|
| Email/password + Google OAuth | Complete |
| Card library (admin-managed, 14 SG cards) | Complete |
| User wallet (add/remove cards) | Complete |
| First-run onboarding flow | Complete |
| Transaction logging (with miles calculation) | Complete |
| Monthly stats dashboard | Complete |
| Spending cap visualisation (progress bars) | Complete |
| Card recommender (category + amount → ranked cards) | Complete |
| Live recommendations inside transaction modal | Complete |
| Effective-date versioning of rates and caps | Complete |
| Per-user data isolation (RLS) | Complete |
| Responsive mobile layout | Complete |
| Per-user selectable bonus category (Lady's Card, Solitaire) | Complete |
| Dashboard proportional spend bars for uncapped categories | Complete |

**Card library (14 cards):**
DBS Altitude, DBS Woman's World, UOB PRVI Miles (Visa), UOB PRVI Miles (Amex), UOB Lady's Card, UOB Lady's Solitaire, UOB Visa Signature, UOB Preferred Platinum Visa, Standard Chartered Journey, Citi PremierMiles, OCBC 90°N, HSBC TravelOne, Maybank Horizon, Singapore Airlines KrisFlyer Visa.

**Recommendation engine capabilities:**
- Handles monthly, quarterly, annual, and per-transaction cap types
- Correctly blends effective MPD when a transaction partially exhausts a cap
- Falls back to `base_mpd` when a cap is fully exhausted
- Returns a status (`optimal` / `partial` / `capped` / `base`) and plain-English reason for each card

---

## 5. Outstanding Work

### Missing but impactful
- **Test suite** — No tests exist. The recommendation engine has complex cap-splitting logic that would benefit significantly from unit tests covering edge cases (period boundaries, partial caps, per-transaction caps).
- **Admin interface for library updates** — Currently, updating card rates/caps requires manual SQL against Supabase. There is no UI for maintaining the library.
- **Combined-cap modelling** — Some cards (e.g. UOB Visa Signature) have a single shared cap across multiple categories. The app models these as independent per-category caps, which overstates available headroom.

### Missing but lower priority
- **No `.env.example`** — Onboarding a new developer requires inspecting the code to know which env vars are needed.
- **No README** — No setup instructions, no description of how to run locally or deploy.
- **Silent failures on pages other than Dashboard** — If a Supabase query fails on Cards, Recommend, or Transactions, the page shows an empty state with no error message.
- **No pagination or date-range control on transactions** — Loads the entire current year. Will become slow with very high transaction volumes.
- **No push notifications or reminders** — Users must actively open the app; there is no proactive "cap almost reached" alert.
- **No export** — No way to export transaction history to CSV or another format.

---

## 6. Risks and Known Issues

### Data accuracy
- **Rates are indicative.** The app shows a footer disclaimer ("Rates are indicative — verify with your bank"). Bank terms change; the library is manually maintained and may lag real-world changes.
- **Combined caps are approximated.** Where a card's cap covers multiple categories together (e.g. UOB Visa Signature's S$2,000/quarter across three categories), the app tracks each category independently. A user who exhausts the shared cap via one category will still see the other categories as uncapped.

### User experience
- **Post-migration empty wallet.** Migration 004 dropped all per-user card data. Existing users who had already selected cards before the migration see an empty wallet and an empty dashboard rather than a prompt to re-select cards. The redirect to onboarding only fires for users who have *never* been onboarded (`isOnboarded` flag in localStorage). Users who were onboarded before the migration must navigate to Cards manually to rebuild their wallet.
- **Onboarding can be skipped.** Users can proceed through onboarding without selecting any cards, resulting in an immediately empty dashboard.

### Security / data
- **Credentials in `.env`** — The `.env` file containing the Supabase URL and anon key is present in the repository. The anon key is safe to expose (it is public by design with RLS), but the file should be gitignored and replaced with `.env.example`.
- **No input sanitisation beyond Supabase client** — Transaction descriptions are free text; they are stored and displayed but not sanitised for XSS. React's default JSX escaping mitigates this, but it is worth confirming no `dangerouslySetInnerHTML` is used with user content.
- **RLS enforcement** — Security relies entirely on Supabase RLS. If a RLS policy is misconfigured, user data could leak. Policies have not been independently audited.

### Technical
- **No error boundaries** — A runtime exception in a page component will crash the entire app. React's default error display will show in production.
- **No offline support** — All data is fetched fresh on login; the app is unusable without network connectivity.
- **Single Supabase project** — There is no staging environment. All development and production activity hits the same database.
