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
    ├─ library_caps                   — Spending caps per (card, category, period, effective_from, cap_group)
    ├─ library_selectable_categories  — Valid bonus-category choices per selectable card
    ├─ user_card_selections           — Per-user wallet (join table)
    ├─ user_category_overrides        — Per-user chosen bonus category for selectable cards
    ├─ transactions                   — Per-user transaction log (includes computed_mpd, manual_mpd, override_note)
    └─ categories                     — Shared lookup table (ids 001–008 from seed; 011=Fashion, 012=Beauty from migration 011)

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
| [supabase/migrations/006_manual_mpd.sql](../supabase/migrations/006_manual_mpd.sql) | Adds computed_mpd, manual_mpd, override_note to transactions |
| [supabase/migrations/007_mile_validity_remarks.sql](../supabase/migrations/007_mile_validity_remarks.sql) | Adds mile_validity and remarks columns to card_library |
| [supabase/migrations/008_card_data_corrections.sql](../supabase/migrations/008_card_data_corrections.sql) | Comprehensive rate/cap corrections for all 14 cards (per milelion.com) |
| [supabase/migrations/009_add_revolution_xlrewards_citirewards.sql](../supabase/migrations/009_add_revolution_xlrewards_citirewards.sql) | Adds HSBC Revolution, Maybank XL Rewards, Citi Rewards Mastercard |
| [supabase/migrations/010_combined_caps.sql](../supabase/migrations/010_combined_caps.sql) | Adds cap_group column; sets combined groups for SC Journey, HSBC Revolution, Maybank XL Rewards, Citi Rewards |
| [supabase/migrations/011_fix_fashion_beauty_categories.sql](../supabase/migrations/011_fix_fashion_beauty_categories.sql) | Adds Fashion (011) and Beauty (012) categories; fixes Lady's Card/Solitaire selectable refs and Citi Rewards |
| [supabase/migrations/012_vendor_mcc_catalogue.sql](../supabase/migrations/012_vendor_mcc_catalogue.sql) | Adds mcc_catalogue and vendor_catalogue tables; adds vendor_name and mcc to transactions |
| [supabase/migrations/013_min_spend_threshold.sql](../supabase/migrations/013_min_spend_threshold.sql) | Adds min_spend to library_caps; sets S$1,000 for UOB Visa Sig and S$500 for Maybank XL Rewards |
| [supabase/migrations/014_payment_channel.sql](../supabase/migrations/014_payment_channel.sql) | Adds payment_channel to library_rates for contactless/online-restricted bonus rates |
| [supabase/migrations/015_transaction_payment_channel.sql](../supabase/migrations/015_transaction_payment_channel.sql) | Adds payment_channel to transactions; adds cap_payment_channel and default_payment_channel to library |
| [supabase/migrations/016_fix_visa_sig_contactless_min_spend.sql](../supabase/migrations/016_fix_visa_sig_contactless_min_spend.sql) | Fixes UOB Visa Sig contactless cap min_spend |
| [supabase/migrations/017_visa_sig_remove_petrol_cap.sql](../supabase/migrations/017_visa_sig_remove_petrol_cap.sql) | Removes UOB Visa Sig petrol rate/cap; card uses contactless wildcard model only |
| [supabase/migrations/018_statement_cycle.sql](../supabase/migrations/018_statement_cycle.sql) | Adds cap_cycle to card_library and statement_day to user_card_selections |
| [supabase/migrations/019_cap_cycle_calendar_default.sql](../supabase/migrations/019_cap_cycle_calendar_default.sql) | Sets all cards to calendar cycle as the current default |
| [supabase/migrations/020_earn_increment.sql](../supabase/migrations/020_earn_increment.sql) | Adds earn_increment to card_library (5 for most banks, 1 for HSBC/Citi) |
| [supabase/migrations/021_online_wildcard_rates.sql](../supabase/migrations/021_online_wildcard_rates.sql) | Converts DBS Woman's World and Citi Rewards to wildcard online rates; removes Citi fashion cap |
| [supabase/library_seed.sql](../supabase/library_seed.sql) | 17-card SG library seed (run after all migrations) |

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
| Transaction editing (edit logged transactions, not just add/delete) | Complete |
| Manual MPD override on transactions (computed_mpd + manual_mpd stored separately) | Complete |
| Mile validity and remarks fields on card library | Complete |
| Comprehensive card data corrections from milelion.com | Complete |
| 3 new cards: HSBC Revolution, Maybank XL Rewards, Citi Rewards Mastercard | Complete |
| Combined cap modelling (cap_group; engine, Dashboard, My Cards all handle correctly) | Complete |
| Lady's Solitaire shows 2 independent cap chips in My Cards | Complete |
| Vendor + MCC catalogue with typeahead in transaction form | Complete |
| Min-spend threshold (locked status in recommender; progress bar toward threshold) | Complete |
| Payment channel on rates + transactions (contactless/online-restricted bonuses) | Complete |
| Wildcard rate pattern (null category + channel = earns bonus on any category) | Complete |
| Channel cap pattern (null category + cap_payment_channel = tracks all channel spend) | Complete |
| UOB Visa Signature contactless model (4 mpd any-category contactless, S$1,000/month) | Complete |
| Statement cycle support (calendar vs statement day per card) | Complete |
| earn_increment / block rounding (S$5 blocks for most banks, S$1 for HSBC/Citi) | Complete |
| Nominal MPD shown in UI; earn block chip in My Cards | Complete |
| DBS Woman's World + Citi Rewards wildcard online 4 mpd (any category, online) | Complete |
| Transactions: sort by column header, wildcard search, mobile horizontal scroll | Complete |
| Lady's Solitaire first-time setup: smart effective_from default (2000-01-01) | Complete |

**Card library (17 cards):**
DBS Altitude, DBS Woman's World, UOB PRVI Miles (Visa), UOB PRVI Miles (Amex), UOB Lady's Card, UOB Lady's Solitaire, UOB Visa Signature, UOB Preferred Platinum Visa, Standard Chartered Journey, Citi PremierMiles, Citi Rewards Mastercard, OCBC 90°N, HSBC TravelOne, HSBC Revolution, Maybank Horizon, Maybank XL Rewards, Singapore Airlines KrisFlyer Visa.

**Recommendation engine capabilities:**
- Handles monthly, quarterly, annual, and per-transaction cap types
- Correctly blends effective MPD when a transaction partially exhausts a cap
- Falls back to `base_mpd` when a cap is fully exhausted
- Handles combined caps (`cap_group`): sums spending across all grouped categories against one shared limit
- Wildcard rate: null-category rate with a payment channel beats any lower per-category rate for that channel
- Channel cap: null-category cap with `cap_payment_channel` tracks all spend on that channel regardless of spending category
- Min-spend threshold: bonus rate locked until total card spend for the period meets the minimum
- Block rounding: miles floored to the nearest `earn_increment`-dollar block per card
- Returns a status (`optimal` / `partial` / `capped` / `base` / `locked`) and plain-English reason for each card

---

## 5. Outstanding Work

### Missing but impactful
- **Test suite** — No tests exist. The recommendation engine has complex branching logic (cap types, blended MPD, wildcard rates, channel caps, selectable overrides, block rounding) that would benefit significantly from unit tests. A regression in any of these paths is currently invisible.
- **Admin interface for library updates** — Updating card rates/caps requires manual SQL against Supabase. There is no UI for maintaining the library.

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
- **Combined caps are modelled** via `cap_group` on `library_caps`. Cards with a shared pool (SC Journey, HSBC Revolution, Maybank XL Rewards, Citi Rewards) show one combined bar/chip and the engine correctly tracks combined spend. UOB Visa Signature previously had a petrol+transport approximation; it is now modelled as a contactless wildcard (any-category contactless earns 4 mpd up to S$1,000/month), which is accurate to the card's actual terms.

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
