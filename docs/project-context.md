# SmileMax — Project Context

## 1. Project Purpose

SmileMax is a personal web app for Singapore credit card holders who want to maximise air miles earned on everyday spending. The core problem it solves: with a wallet of several cards, each offering different bonus rates and monthly/quarterly/annual spend caps, it is non-trivial to know which card to use for a given purchase at any point in time.

The app tracks all card spend, computes cap usage in real time, and recommends the card that will yield the highest **effective MPD (miles per dollar)** for the next transaction — accounting for caps that have been partially or fully exhausted.

It also functions as a general personal expense tracker: cashback credit cards and cash/debit spend are tracked alongside miles cards, so the user can see total spend, cashback earned, and category breakdowns across all payment methods in one place.

**Target user:** A single Singapore resident with a small wallet (5–15 cards) who already understands miles earning but wants tooling to stop leaving miles on the table, and to track all their spending in one place.

---

## 2. Architecture

```
Browser (React + Vite + TypeScript)
    │
    ├─ AuthContext         — Supabase Auth (email/password + Google OAuth)
    ├─ AppContext          — All app data; loaded at login; derived wallet state
    │
    ├─ pages/             — Route-level components
    │   ├─ Dashboard      — Monthly stats, wallet cap bars, recent transactions
    │   ├─ Expenses       — Full spend breakdown: by type, category, card; Trends tab with Recharts bar charts
    │   ├─ MileValue      — Static mile value calculator (ticket price + miles → cpp vs 1.5¢ benchmark)
    │   ├─ Cards          — Card library browser with type/bank filters; wallet management
    │   ├─ Recommend      — Ad-hoc card recommender for a given category + amount
    │   ├─ Transactions   — Transaction log with filters, sort, inline miles/cashback
    │   ├─ Onboarding     — First-run card selection flow
    │   ├─ Login          — Auth entry point
    │   └─ Admin          — Feedback inbox (admin-only); resolve/reopen bug reports
    │
    ├─ components/        — Shared UI (Layout, Modal, CapUsageBar, StatusBadge, VendorInput, ProtectedRoute, StatementDayPrompt, ExpensesTrends)
    └─ lib/
        ├─ recommendations.ts  — Core cap-aware recommendation engine
        ├─ types.ts            — All TypeScript interfaces
        ├─ utils.ts            — Formatting, date helpers, constants
        ├─ supabase.ts         — Supabase client
        └─ starterCards.ts     — Default card data for onboarding seed

Supabase (Postgres + Auth + RLS)
    ├─ card_library                   — Admin-managed list of SG credit cards (card_type, cashback_rate added)
    ├─ library_rates                  — Bonus MPD per (card, category, effective_from)
    ├─ library_caps                   — Spending caps per (card, category, period, effective_from, cap_group)
    ├─ library_cashback_rates         — Per-category cashback rate overrides (e.g. Citi 8% dining)
    ├─ library_selectable_categories  — Valid bonus-category choices per selectable card
    ├─ user_card_selections           — Per-user wallet (join table)
    ├─ user_category_overrides        — Per-user chosen bonus category for selectable cards
    ├─ transactions                   — Per-user transaction log (miles + cashback fields; vendor_name, mcc, payment_channel, personal_amount)
    ├─ categories                     — Shared lookup table (ids 001–012)
    ├─ mcc_catalogue                  — Admin-seeded MCC code → description lookup
    ├─ vendor_catalogue               — Admin-seeded vendor → default category + MCC
    └─ feedback                       — User-submitted bug reports and suggestions (admin-managed)

Deployment: Cloudflare Pages (`wrangler.toml`; `[assets]` serves the Vite `dist/` output)
  - `not_found_handling = "single-page-application"` ensures all unmatched routes serve index.html (SPA refresh fix)
  - `npm run deploy` = `npm run build && wrangler deploy` (always rebuilds before uploading)
  - Live at `smilemax.pages.dev`; auto-deploys on push to `main`
```

**Data flow at login:**
1. Supabase Auth resolves the session.
2. `AppContext` fires parallel loads: full card library (cards + rates + caps + cashback rates + categories + MCC/vendor catalogues), user's wallet selections, and current-year transactions.
3. Everything lives in React state for the session; no client-side cache or service worker.
4. The recommendation engine runs entirely in the browser against this in-memory data.

**Key design decisions:**
- All data loaded upfront — dataset is small enough that lazy loading adds complexity without benefit.
- Card library is read-only for users; only an admin can update rates/caps. This avoids per-user drift in card metadata.
- Effective-date versioning (`effective_from`) on rates and caps allows historic accuracy without deleting old records. The engine resolves the row with the latest `effective_from ≤ today`.
- Cap usage is computed client-side from the transaction log (`buildPeriodSpending` in `recommendations.ts`) rather than stored, so it is always consistent.
- Expense tracking (cashback/debit) is additive: a `card_type` discriminator on `card_library` gates all miles-specific logic. Cashback and debit transactions are fully tracked for spend but skip the miles engine entirely.
- The Cash/Debit card is a system-level virtual card (never in the user's wallet, always injected into the transaction form) so every user can log cash spend without any setup.

---

## 3. Key Files

| File | Purpose |
|---|---|
| [src/lib/recommendations.ts](../src/lib/recommendations.ts) | Core engine — cap resolution, period spend aggregation, effective MPD calculation, card ranking |
| [src/context/AppContext.tsx](../src/context/AppContext.tsx) | Global state — library load, wallet selection, transaction list, cashback rates, derived `cards` + `allCards` arrays |
| [src/context/AuthContext.tsx](../src/context/AuthContext.tsx) | Supabase Auth session management |
| [src/lib/types.ts](../src/lib/types.ts) | All shared TypeScript interfaces |
| [src/lib/utils.ts](../src/lib/utils.ts) | `getPeriodStart()`, formatting helpers, constants |
| [src/lib/starterCards.ts](../src/lib/starterCards.ts) | Default SG cards used during onboarding |
| [src/pages/Dashboard.tsx](../src/pages/Dashboard.tsx) | Monthly stats (miles, cashback, total spent), wallet cap bars, spend milestones, recent transactions |
| [src/pages/Expenses.tsx](../src/pages/Expenses.tsx) | Full expense breakdown: Overview (spend by type, category bars, by card) and Trends tab (3 Recharts grouped bar charts) |
| [src/pages/MileValue.tsx](../src/pages/MileValue.tsx) | Static mile value calculator — ticket price + miles + optional co-payment → cents per mile with colour-coded benchmark |
| [src/components/ExpensesTrends.tsx](../src/components/ExpensesTrends.tsx) | Trends tab charts — fetches directly from Supabase for cross-year support; useIsMobile hook for responsive config |
| [src/components/StatementDayPrompt.tsx](../src/components/StatementDayPrompt.tsx) | Auto-popup in Layout for any statement-cycle card missing a statement_day; dismissed per-session |
| [src/pages/Transactions.tsx](../src/pages/Transactions.tsx) | Transaction log with month/category/card filters, wildcard search, sort; add/edit modal with live recs, MCC lookup, cashback preview |
| [src/pages/Recommend.tsx](../src/pages/Recommend.tsx) | Ad-hoc card recommender for a given category + amount |
| [src/pages/Cards.tsx](../src/pages/Cards.tsx) | Library browser with type/bank filter chips and card type badges; add/remove cards from wallet |
| [src/pages/Admin.tsx](../src/pages/Admin.tsx) | Feedback inbox (admin-only) — resolve/reopen bug reports and suggestions |
| [src/pages/Onboarding.tsx](../src/pages/Onboarding.tsx) | First-run card selection flow |
| [src/components/Layout.tsx](../src/components/Layout.tsx) | App shell — sidebar nav, mobile overlay, feedback modal, disclaimer modal, open-feedback badge |
| [supabase/migrations/004_library_model.sql](../supabase/migrations/004_library_model.sql) | Library + user_card_selections schema |
| [supabase/migrations/005_selectable_categories.sql](../supabase/migrations/005_selectable_categories.sql) | Per-user selectable bonus category schema and seed |
| [supabase/migrations/006_manual_mpd.sql](../supabase/migrations/006_manual_mpd.sql) | Adds computed_mpd, manual_mpd, override_note to transactions |
| [supabase/migrations/007_mile_validity_remarks.sql](../supabase/migrations/007_mile_validity_remarks.sql) | Adds mile_validity and remarks columns to card_library |
| [supabase/migrations/008_card_data_corrections.sql](../supabase/migrations/008_card_data_corrections.sql) | Comprehensive rate/cap corrections for all cards (per milelion.com) |
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
| [supabase/migrations/022_feedback.sql](../supabase/migrations/022_feedback.sql) | Adds feedback table for bug reports and suggestions; admin-only RLS policies |
| [supabase/migrations/023_add_prvi_mastercard_amex_ascend.sql](../supabase/migrations/023_add_prvi_mastercard_amex_ascend.sql) | Adds UOB PRVI Miles Mastercard (card 018) and Amex KrisFlyer Ascend (card 019) |
| [supabase/migrations/024_expense_tracking.sql](../supabase/migrations/024_expense_tracking.sql) | Adds card_type + cashback_rate to card_library; cashback_earned to transactions; library_cashback_rates table; seeds cashback and debit cards (020–023) |
| [supabase/migrations/025_personal_amount.sql](../supabase/migrations/025_personal_amount.sql) | Adds personal_amount NUMERIC to transactions for group-spend splitting |
| [supabase/migrations/026_visa_sig_statement_cycle.sql](../supabase/migrations/026_visa_sig_statement_cycle.sql) | Corrects UOB Visa Signature cap_cycle from 'calendar' to 'statement' |
| [supabase/library_seed.sql](../supabase/library_seed.sql) | Full 23-card SG library seed — 19 miles cards, 3 cashback cards, 1 debit card (run after all migrations) |

---

## 4. Current Implementation Status

The app is a functional MVP. All core features are implemented:

| Feature | Status |
|---|---|
| Email/password + Google OAuth | Complete |
| Card library (admin-managed, 23 cards) | Complete |
| User wallet (add/remove cards) | Complete |
| First-run onboarding flow | Complete |
| Transaction logging (miles + cashback calculation) | Complete |
| Monthly stats dashboard (miles, cashback, total spent) | Complete |
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
| Combined cap modelling (cap_group; engine, Dashboard, My Cards all handle correctly) | Complete |
| Vendor + MCC catalogue with typeahead in transaction form | Complete |
| MCC reverse lookup — type a keyword to find the MCC code | Complete |
| Notes field in transaction form (positioned after Vendor) | Complete |
| Min-spend threshold (locked status in recommender; progress bar toward threshold) | Complete |
| Payment channel on rates + transactions (contactless/online-restricted bonuses) | Complete |
| Wildcard rate pattern (null category + channel = earns bonus on any category) | Complete |
| Channel cap pattern (null category + cap_payment_channel = tracks all channel spend) | Complete |
| UOB Visa Signature contactless model (4 mpd any-category contactless, S$1,000/month) | Complete |
| Statement cycle support (calendar vs statement day per card) | Complete |
| earn_increment / block rounding (S$5 blocks for most banks, S$1 for HSBC/Citi) | Complete |
| Nominal MPD shown in UI; earn block chip in My Cards | Complete |
| DBS Woman's World + Citi Rewards wildcard online 4 mpd (any category, online) | Complete |
| Transactions: sort by column header, wildcard search, mobile card list | Complete |
| Lady's Solitaire first-time setup: smart effective_from default (2000-01-01) | Complete |
| Feedback system (bug reports + suggestions, admin inbox with resolve/reopen) | Complete |
| Feedback badge in sidebar (live count of open items, updates on resolve/reopen) | Complete |
| UOB PRVI Miles Mastercard and Amex KrisFlyer Ascend added to library | Complete |
| Expense tracking — cashback cards (card_type, cashback_rate, cashback_earned) | Complete |
| Expense tracking — Cash/Debit virtual card (system-level, no wallet setup needed) | Complete |
| Per-category cashback rate overrides (library_cashback_rates) | Complete |
| Dedicated Expenses page (spend by type, category bars, spend by card) | Complete |
| Cards page: type filter (Miles/Cashback) and bank filter chips | Complete |
| Cards page: card type badge (miles/cashback) with rate or mile validity | Complete |
| Dashboard wallet: filter chips by type (Miles/Cashback/Cash/Debit) and bank | Complete |
| Dashboard wallet: Cash/Debit summary row when debit spend exists | Complete |
| Transaction form: Cash/Debit always available in card dropdown (no wallet setup) | Complete |
| Transaction filter: card dropdown includes Cash/Debit | Complete |
| SPA deep-link refresh fix (Cloudflare Pages not_found_handling) | Complete |
| Fully fluid layout — no max-width caps; 2xl breakpoint grids on Dashboard and Cards | Complete |
| Cross-device onboarding detection — Supabase-backed hasActivity replaces localStorage-only guard | Complete |
| Group-spend split — optional collapsible section in transaction form (÷2/÷3/÷4 chips + custom) | Complete |
| personal_amount stored on transaction; miles/cashback always earned on full card amount | Complete |
| Expenses: Card spend / My spend toggle (hidden until ≥1 group spend exists) | Complete |
| Expenses: My spend mode banner explaining that rewards are always on full amount | Complete |
| Dashboard Total Spent sub-line shows personal share when any group spends exist | Complete |
| Transactions list: "yours: S$X" indigo label when personal_amount set and differs from amount | Complete |
| Group-split info popup (ⓘ) in transaction form explaining the feature | Complete |
| Log Transaction button on Dashboard — one tap to open the add-transaction modal from the home page | Complete |
| Transactions: Export CSV — filtered view, plain-text categories, Personal Share always populated | Complete |
| Expenses: Export Excel (.xlsx) — 5-sheet workbook with Definitions, Summary, By Category, By Card, Transactions | Complete |
| Expenses Excel: Card Spend and My Spend columns side-by-side on every sheet (no pre-toggle needed) | Complete |
| Onboarding race condition fix — dataLoaded guard (allCards.length > 0) prevents false redirect | Complete |
| Mile Value Calculator (/calculator) — ticket price + miles + optional co-payment → cpp vs 1.5¢ benchmark | Complete |
| Expenses: Trends tab — 3 grouped bar charts (spend by card type, rewards, top categories); 3M/6M/12M + custom range | Complete |
| UOB Visa Signature cap_cycle corrected to 'statement' (migration 026) | Complete |
| StatementDayPrompt — auto-popup for statement-cycle cards with no statement_day; per-session dismissal | Complete |
| Billing cycle label fix — 'closing day' → 'starts on day' throughout to match engine semantics | Complete |
| Cycle-end proximity warning in transaction form — amber alert within 5 days of cycle end | Complete |
| Trends charts: mobile improvements — angled labels, compact Y-axis, 3M default, legend top, distinct colours | Complete |

**Card library (23 cards):**

*Miles cards (19):* DBS Altitude, DBS Woman's World, UOB PRVI Miles (Visa/Amex/Mastercard), UOB Lady's Card, UOB Lady's Solitaire, UOB Visa Signature, UOB Preferred Platinum Visa, UOB KrisFlyer Visa, Standard Chartered Journey, Citi PremierMiles, Citi Rewards Mastercard, OCBC 90°N, HSBC TravelOne, HSBC Revolution, Maybank Horizon, Maybank XL Rewards, Amex KrisFlyer Ascend.

*Cashback cards (3):* Standard Chartered Simply Cash (1.5%), UOB Absolute Cashback (1.7%), Citi Cash Back+ (1.6% flat).

*Debit / Cash (1):* Cash / Debit — system-level card, tracks spend only, no rewards.

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
- Engine is only invoked for `card_type === 'miles'` cards; cashback and debit transactions skip it entirely

---

## 5. Outstanding Work

### Missing but impactful
- **Test suite** — No tests exist. The recommendation engine has complex branching logic (cap types, blended MPD, wildcard rates, channel caps, selectable overrides, block rounding) that would benefit significantly from unit tests. A regression in any of these paths is currently invisible.
- **Admin interface for library updates** — Updating card rates/caps requires manual SQL against Supabase. There is no admin UI.

### Missing but lower priority
- **No `.env.example`** — Onboarding a new developer requires inspecting the code to know which env vars are needed.
- **No README** — No setup instructions, no description of how to run locally or deploy.
- **Silent failures on pages other than Dashboard** — If a Supabase query fails on Cards, Recommend, or Transactions, the page shows an empty state with no error message.
- **No pagination or date-range control on transactions** — Loads the entire current year. Will become slow with very high transaction volumes.
- **No push notifications or reminders** — Users must actively open the app; there is no proactive "cap almost reached" alert.
- **Mobile dashboard navigation** — Dashboard can be long on phones (stats, milestones, wallet bars, recent transactions all on one scroll). Ideas discussed (sticky sub-nav, collapsible sections, quick-jump chips) but deferred by design — not implementing for now.

---

## 6. Risks and Known Issues

### Data accuracy
- **Rates are indicative.** The app shows a footer disclaimer ("Rates are indicative — verify with your bank"). Bank terms change; the library is manually maintained and may lag real-world changes.
- **Combined caps are modelled** via `cap_group` on `library_caps`. Cards with a shared pool (SC Journey, HSBC Revolution, Maybank XL Rewards, Citi Rewards) show one combined bar/chip and the engine correctly tracks combined spend. UOB Visa Signature is modelled as a contactless wildcard (any-category contactless earns 4 mpd up to S$1,000/month), which is accurate to the card's actual terms.

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
