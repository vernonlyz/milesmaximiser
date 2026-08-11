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
    ├─ pages/             — Route-level components (all lazy-loaded via React.lazy + Suspense)
    │   ├─ Dashboard      — Monthly stats, wallet cap bars, recent transactions
    │   ├─ Expenses       — Full spend breakdown: by type, category, card; Trends tab with Recharts bar charts
    │   ├─ MileValue      — Static mile value calculator (ticket price + miles → cpp vs 1.5¢ benchmark)
    │   ├─ Cards          — Card library browser (uniform tile grid + details modal); type/bank/wallet filters
    │   ├─ Recommend      — Ad-hoc card recommender for a given category + amount
    │   ├─ Transactions   — Transaction log with filters, sort, inline miles/cashback; favourite (recurring) templates
    │   ├─ Miles          — Miles Balance: per-account opening snapshot, expiry warnings, pooling, redemption ledger (Balance tab)
    │   ├─ Earnings       — Miles Earned: per-card earnings by billing cycle, monthly + cumulative chart (Earned tab)
    │   ├─ Points         — EXPERIMENTAL (admin-gated): bank reward-points balance per program (Points tab)
    │   ├─ Reconcile      — EXPERIMENTAL (admin-gated): base/bonus credit reconciliation per cycle (Reconcile tab)
    │   ├─ Onboarding     — First-run card selection flow
    │   ├─ Login          — Auth entry point
    │   └─ Admin          — Feedback inbox (admin-only); resolve/reopen bug reports
    │
    ├─ context/          — AuthContext, AppContext, ToastContext (app-wide toast notifications)
    ├─ components/        — Shared UI (Layout, Modal, CapUsageBar, StatusBadge, VendorInput, ProtectedRoute, StatementDayPrompt, UpdatePrompt, ExpensesTrends, MilesTabs, DatePicker, PartialBonusNote, ErrorBoundary, MccInfo, Skeleton, ErrorState)
    └─ lib/
        ├─ recommendations.ts  — Core cap-aware recommendation engine (unit-tested: recommendations.test.ts)
        ├─ types.ts            — All TypeScript interfaces
        ├─ utils.ts            — Formatting, date helpers, constants
        ├─ supabase.ts         — Supabase client
        └─ starterCards.ts     — Default card data for onboarding seed

Supabase (Postgres + Auth + RLS)
    ├─ card_library                   — Admin-managed SG cards (card_type, cashback_rate; credit rules: base_timing/bonus_timing/bonus_by_category/bonus_rounding/no_bonus_split; boost_mpd/boost_label; mcc_mode 'whitelist'|'blacklist') (migrations 036/038/039/041/046)
    ├─ library_rates                  — Bonus MPD per (card, category, effective_from)
    ├─ library_caps                   — Spending caps per (card, category, period, effective_from, cap_group)
    ├─ library_cashback_rates         — Per-category cashback rate overrides (e.g. Citi 8% dining)
    ├─ library_selectable_categories  — Valid bonus-category choices per selectable card
    ├─ user_card_selections           — Per-user wallet (join table)
    ├─ user_category_overrides        — Per-user chosen bonus category for selectable cards
    ├─ transactions                   — Per-user transaction log (…, reconciled, recurring_id → rule; future-dated rows are recurring occurrences) (migration 042)
    ├─ transaction_favourites         — Saved templates + recurring RULES (recur_unit/recur_interval/start_date/end_date/max_occurrences) (migrations 029, 033, 042)
    ├─ user_card_boosts               — Per-user effective-dated rate-boost on/off log (migration 040)
    ├─ reward_programs                — EXPERIMENTAL: bank reward currency + miles_per_point (migration 035)
    ├─ card_reward_program            — EXPERIMENTAL: card → reward currency (migration 035)
    ├─ points_accounts / points_adjustments — EXPERIMENTAL: per-user points balance + ledger (migration 035)
    ├─ credit_reconciliations         — EXPERIMENTAL: per-cycle base/bonus/bonus_boost reconciliation (migrations 036)
    ├─ transaction_point_recon        — EXPERIMENTAL: per-transaction base reconciled flag (migration 037)
    ├─ miles_accounts                 — Per-user miles balance owner: opening snapshot + as-of date + expiry (migration 028)
    ├─ miles_account_cards            — Links cards to a miles account (a card belongs to one; pooling) (migration 028)
    ├─ miles_adjustments              — Dated ledger of redemptions (negative) and bonuses (positive) per account (migration 028)
    ├─ user_settings                  — Per-user singleton: cumulative miles_goal + miles_goal_label (migrations 031–032)
    ├─ categories                     — Shared lookup table (ids 001–015; +Insurance/Subscription/Health, migration 043)
    ├─ mcc_catalogue                  — Admin-seeded MCC code → description lookup
    ├─ card_mcc_eligibility           — MCC ranges per card interpreted by card_library.mcc_mode: whitelist = these earn bonus, blacklist = these are excluded, hybrid = channel-dependent (per-row payment_channel; migration 053); per-row `reduced` flag = earns a reduced rate not zero (migration 065); shared read-only (migrations 044/045/048/049/051/053/054/055/056/057/058/059/060/061/062/063/064/065/066/067)
    ├─ vendor_catalogue               — Admin-seeded vendor → default category + MCC
    ├─ feedback                       — User-submitted bug reports and suggestions (admin-managed)
    └─ card_export_aliases            — Per-user card→export-name aliases (per-category for selectable cards) used by the Admin CSV export (migration 073)

Tooling: `npm run build` = `tsc -b && vite build` (→ `dist/`); `npm test` = Vitest (engine unit tests).
  - `postbuild` copies `dist/index.html` → `dist/404.html` — this is the SPA deep-link fallback on Cloudflare Pages.
  - **Vitest is pinned to `^2`** (vite-5 compatible). Vitest 4 bundles vite 6/7 → a second esbuild (0.28.1) tree that npm 10 (Cloudflare) and npm 11 (local) dedupe differently, breaking `npm ci`. Keep it aligned with the project's vite 5 (single esbuild 0.21.5).

Deployment: Cloudflare Pages (repo-connected; build command `npm run build`, output dir `dist`)
  - Installable PWA via `vite-plugin-pwa` (generateSW). Service worker uses `registerType: 'autoUpdate'` with
    `cleanupOutdatedCaches` + `skipWaiting` + `clientsClaim`; `UpdatePrompt` auto-reloads once on update.
  - SPA deep-links resolve via the `404.html` copy (postbuild); unmatched routes serve the app shell.
  - Live at `smilemax.pages.dev`; auto-deploys on push to `main`
```

**Data flow at login:**
1. Supabase Auth resolves the session.
2. `AppContext` fires parallel loads: full card library (cards + rates + caps + cashback rates + categories + MCC/vendor catalogues), user's wallet selections, and current-year transactions.
3. Core app data lives in React state for the session, exposed via `refresh()` / `refreshTransactions()` (now typed `Promise<void>` so pull-to-refresh can await them). A PWA service worker caches the app shell (JS/CSS/HTML); Miles/Earnings pages fetch their own data (miles_accounts/adjustments, all-time transactions) directly from Supabase on load.
4. The recommendation engine runs entirely in the browser against this in-memory data.

**Key design decisions:**
- Core app data loaded upfront (small dataset); **route page components are code-split** via `React.lazy` + `Suspense`, so the initial JS bundle stays small (recharts loads lazily only on chart pages).
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
| [src/pages/Dashboard.tsx](../src/pages/Dashboard.tsx) | Monthly stats (miles, cashback, total spent), wallet cap bars, spend milestones, recent transactions, conditional expiring-miles nudge |
| [src/pages/Expenses.tsx](../src/pages/Expenses.tsx) | Full expense breakdown: Overview (spend by type, category bars, by card) and Trends tab (3 Recharts grouped bar charts) |
| [src/pages/MileValue.tsx](../src/pages/MileValue.tsx) | Static mile value calculator — ticket price + miles + optional co-payment → cents per mile with colour-coded benchmark |
| [src/components/ExpensesTrends.tsx](../src/components/ExpensesTrends.tsx) | Trends tab charts — fetches directly from Supabase for cross-year support; useIsMobile hook for responsive config |
| [src/components/StatementDayPrompt.tsx](../src/components/StatementDayPrompt.tsx) | Auto-popup in Layout for any statement-cycle card missing a statement_day; dismissed per-session |
| [src/pages/Transactions.tsx](../src/pages/Transactions.tsx) | Transaction log with month/category/card filters, wildcard search, sort; add/edit modal with live recs, MCC lookup, cashback preview |
| [src/pages/Recommend.tsx](../src/pages/Recommend.tsx) | Ad-hoc card recommender for a given category + amount |
| [src/pages/Cards.tsx](../src/pages/Cards.tsx) | Library browser — uniform tile grid (sorted by bank), Details modal with full rates/caps/remarks; type/bank/wallet filters; add/remove with confirmation |
| [src/pages/Miles.tsx](../src/pages/Miles.tsx) | Miles Balance — per-account opening snapshot + as-of date, expiry warnings (6-month), UOB-style pooling, redemption/bonus ledger, reconcile, default KrisFlyer balance, total across all |
| [src/pages/Earnings.tsx](../src/pages/Earnings.tsx) | Miles Earned — per-card miles by billing cycle (calendar or statement), monthly + cumulative chart, per-card chart/numbers toggle and collapse, year selector |
| [src/components/MilesTabs.tsx](../src/components/MilesTabs.tsx) | Balance / Earned tab bar shared by Miles.tsx and Earnings.tsx (one "Miles" nav section) |
| [src/context/ToastContext.tsx](../src/context/ToastContext.tsx) | App-wide toast notifications — `useToast()` hook + auto-dismissing toaster (sits above mobile bottom nav) |
| [src/components/UpdatePrompt.tsx](../src/components/UpdatePrompt.tsx) | Registers the PWA service worker; auto-reloads once when an updated SW takes control (isUpdate guard) |
| [src/pages/Admin.tsx](../src/pages/Admin.tsx) | Feedback inbox (admin-only) — resolve/reopen bug reports and suggestions |
| [src/pages/Onboarding.tsx](../src/pages/Onboarding.tsx) | First-run card selection flow |
| [src/components/Layout.tsx](../src/components/Layout.tsx) | App shell — desktop sidebar + mobile bottom tab bar (Home/Recommend/Log/Cards/More), pull-to-refresh + mobile refresh button, install banner/modals, feedback/disclaimer modals, open-feedback badge |
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
| [supabase/migrations/027_miles_balances.sql](../supabase/migrations/027_miles_balances.sql) | First-cut per-card miles_balances table (superseded by 028; kept for migration history) |
| [supabase/migrations/028_miles_accounts.sql](../supabase/migrations/028_miles_accounts.sql) | miles_accounts + miles_account_cards + miles_adjustments; migrates any 027 rows into per-card accounts, drops miles_balances |
| [supabase/migrations/029_transaction_favourites.sql](../supabase/migrations/029_transaction_favourites.sql) | transaction_favourites table (saved transaction templates), RLS per user |
| [supabase/migrations/030_miles_account_goal.sql](../supabase/migrations/030_miles_account_goal.sql) | Per-account goal_miles (superseded by 031, which drops it) |
| [supabase/migrations/031_user_miles_goal.sql](../supabase/migrations/031_user_miles_goal.sql) | user_settings table (cumulative miles_goal); drops per-account goal_miles |
| [supabase/migrations/032_miles_goal_label.sql](../supabase/migrations/032_miles_goal_label.sql) | Adds miles_goal_label to user_settings (e.g. "SQ Suites to JFK") |
| [supabase/migrations/033_recurring_favourites.sql](../supabase/migrations/033_recurring_favourites.sql) | Adds recurrence/recur_day/next_due_date to transaction_favourites (monthly recurring charges) |
| [supabase/migrations/034_transaction_reconciled.sql](../supabase/migrations/034_transaction_reconciled.sql) | Adds reconciled BOOLEAN to transactions (bank-statement reconciliation) |
| supabase/migrations/035–041 | EXPERIMENTAL Points/Reconcile/rate-boost: reward programs & points ledgers (035), credit rules + credit_reconciliations (036), transaction_point_recon (037), bonus_rounding (038), rate boost + effective-dating (039–040), no_bonus_split (041) |
| [supabase/migrations/042_recurring_rules.sql](../supabase/migrations/042_recurring_rules.sql) | Recurring rules (recur fields on transaction_favourites; transactions.recurring_id) — real future transactions |
| [supabase/migrations/043_add_categories.sql](../supabase/migrations/043_add_categories.sql) | Adds Insurance / Subscription / Health categories |
| [supabase/migrations/044_card_mcc_eligibility.sql](../supabase/migrations/044_card_mcc_eligibility.sql) | Bonus-eligible MCC ranges per card + Lady's Solitaire whitelist seed (adds 6 MCC descriptions) |
| [supabase/migrations/045_hsbc_revolution_mcc.sql](../supabase/migrations/045_hsbc_revolution_mcc.sql) | HSBC Revolution flat whitelist + 16 missing MCC descriptions |
| [supabase/migrations/046_mcc_mode.sql](../supabase/migrations/046_mcc_mode.sql) | Adds card_library.mcc_mode ('whitelist'\|'blacklist'); sets HSBC Revolution + UOB Lady's Solitaire to whitelist |
| [supabase/migrations/047_revolution_boost.sql](../supabase/migrations/047_revolution_boost.sql) | HSBC Revolution boost → 8 mpd with an Everyday Global Account (boost_mpd/boost_label; reuses rate-boost machinery) |
| [supabase/migrations/048_citi_rewards_blacklist.sql](../supabase/migrations/048_citi_rewards_blacklist.sql) | Citi Rewards blacklist + excluded MCC ranges (+4 MCC descriptions) |
| [supabase/migrations/049_dbs_womens_blacklist.sql](../supabase/migrations/049_dbs_womens_blacklist.sql) | DBS Woman's World blacklist — 44 excluded MCCs as singles (+32 MCC descriptions) |
| [supabase/migrations/050_maribank_card.sql](../supabase/migrations/050_maribank_card.sql) | Adds MariBank Mari Credit Card (card 024) — 1.5% cashback |
| [supabase/migrations/051_ladys_krisflyer_mcc.sql](../supabase/migrations/051_ladys_krisflyer_mcc.sql) | Whitelist MCCs for UOB Lady's Card (mirrors Solitaire) + UOB KrisFlyer Visa (dining/transport/online shopping) |
| [supabase/migrations/052_recon_mismatch_resolved.sql](../supabase/migrations/052_recon_mismatch_resolved.sql) | EXPERIMENTAL Reconcile: `mismatch_resolved` flag on `credit_reconciliations` (accept a bonus mismatch) |
| [supabase/migrations/053_uob_pref_platinum_hybrid_mcc.sql](../supabase/migrations/053_uob_pref_platinum_hybrid_mcc.sql) | `payment_channel` on `card_mcc_eligibility` + `hybrid` mcc_mode; UOB Preferred Platinum (online whitelist / contactless all / shared exclusions) |
| [supabase/migrations/054_uob_visa_signature_hybrid_mcc.sql](../supabase/migrations/054_uob_visa_signature_hybrid_mcc.sql) | UOB Visa Signature hybrid — same exclusions, no online whitelist (contactless-only bonus; petrol eligible) |
| [supabase/migrations/055_maybank_xl_rewards_mcc.sql](../supabase/migrations/055_maybank_xl_rewards_mcc.sql) | Maybank XL Rewards whitelist — Dine / Shop / Travel / Play MCCs |
| [supabase/migrations/056_maybank_horizon_mcc.sql](../supabase/migrations/056_maybank_horizon_mcc.sql) | Maybank Horizon whitelist — Supermarkets/Dining, Transport/Petrol, Retail, Air/Hotels/Cruise (8699 = Diamond Sky Fuel Card only) |
| [supabase/migrations/057_sc_journey_mcc.sql](../supabase/migrations/057_sc_journey_mcc.sql) | SC Journey whitelist, ONLINE-scoped (payment_channel='online') — transport / online grocery-food / online delivery |
| [supabase/migrations/058_citi_premiermiles_blacklist.sql](../supabase/migrations/058_citi_premiermiles_blacklist.sql) | Citi PremierMiles blacklist — excluded MCCs (finance, insurance, government, quasi-cash, etc.) |
| [supabase/migrations/059_uob_prvi_blacklist.sql](../supabase/migrations/059_uob_prvi_blacklist.sql) | UOB PRVI Miles trio (Visa/Amex/Mastercard) blacklist — shared excluded MCCs (CROSS JOIN) |
| [supabase/migrations/060_dbs_altitude_blacklist.sql](../supabase/migrations/060_dbs_altitude_blacklist.sql) | DBS Altitude blacklist — excluded MCCs (finance, insurance, rent, government, education, etc.) |
| [supabase/migrations/061_amex_ascend_blacklist.sql](../supabase/migrations/061_amex_ascend_blacklist.sql) | Amex KrisFlyer Ascend blacklist — only MCC-mappable exclusions (utilities, insurance, stored-value); merchant/txn-type exclusions omitted |
| [supabase/migrations/062_ocbc_90n_blacklist.sql](../supabase/migrations/062_ocbc_90n_blacklist.sql) | OCBC 90°N blacklist — excluded MCCs (finance, insurance, rent, stored-value, government, education, etc.) |
| [supabase/migrations/063_hsbc_travelone_blacklist.sql](../supabase/migrations/063_hsbc_travelone_blacklist.sql) | HSBC TravelOne blacklist — excluded MCCs (finance/PSP/MoneySend, insurance, rent, stored-value, gambling, government, etc.) |
| [supabase/migrations/064_sc_simply_cash_blacklist.sql](../supabase/migrations/064_sc_simply_cash_blacklist.sql) | SC Simply Cash (cashback) blacklist — excluded MCCs earn no cashback; MCC hint wording is card-type aware |
| [supabase/migrations/065_uob_absolute_reduced.sql](../supabase/migrations/065_uob_absolute_reduced.sql) | Adds `reduced` flag to card_mcc_eligibility + reduced-rate state; UOB Absolute Cashback categories earn 0.3% (not zero) |
| [supabase/migrations/066_citi_cashback_plus_blacklist.sql](../supabase/migrations/066_citi_cashback_plus_blacklist.sql) | Citi Cash Back+ (cashback) blacklist — mirrors Citi PremierMiles exclusion list |
| [supabase/migrations/067_maribank_blacklist.sql](../supabase/migrations/067_maribank_blacklist.sql) | MariBank (cashback) blacklist — indicative MCCs for excluded categories (money transfer, finance, insurance, gambling, government, etc.) |
| [supabase/migrations/068_rename_uob_preferred_visa.sql](../supabase/migrations/068_rename_uob_preferred_visa.sql) | Rename UOB "Preferred Platinum Visa" → "Preferred Visa" (display only) |
| [supabase/migrations/069_maybank_xl_rewards_mcc_fix.sql](../supabase/migrations/069_maybank_xl_rewards_mcc_fix.sql) | Reconcile XL Rewards whitelist with published Dine/Shop/Travel/Play table |
| [supabase/migrations/070_hsbc_revolution_mcc_groups.sql](../supabase/migrations/070_hsbc_revolution_mcc_groups.sql) | HSBC Revolution — add category groupings to MCC rows (codes unchanged) |
| [supabase/migrations/071_revolution_boost_cap.sql](../supabase/migrations/071_revolution_boost_cap.sql) | HSBC Revolution boost cap (EGA → S$1,200) — `boost_cap` column + engine `applyCapBoosts` |
| [supabase/migrations/072_online_bonus_and_instore_fashion.sql](../supabase/migrations/072_online_bonus_and_instore_fashion.sql) | `card_library.bonus_channel` (online-only: DBS WWMC + Citi Rewards) + `card_mcc_eligibility.always_eligible`; Citi in-store fashion rows |
| [supabase/migrations/073_card_export_aliases.sql](../supabase/migrations/073_card_export_aliases.sql) | `card_export_aliases` (per-user card→export-name map, per-category for selectable cards; RLS); used by the Admin CSV export |
| [supabase/migrations/074_vendor_catalogue_admin_write.sql](../supabase/migrations/074_vendor_catalogue_admin_write.sql) | Admin write RLS on `vendor_catalogue` (auth.email() = admin) so the Admin Vendors→MCC editor can add/edit/delete |
| [supabase/migrations/075_vendor_mcc_confidence.sql](../supabase/migrations/075_vendor_mcc_confidence.sql) | `vendor_catalogue.mcc_confidence` (unverified/likely/confirmed, default likely) — vendor→MCC confidence tag |
| [supabase/migrations/076_miles_balance_history.sql](../supabase/migrations/076_miles_balance_history.sql) | `miles_balance_history` — dated balance snapshots per account (reconcile/manual; RLS, cascade on account delete) |
| [src/lib/mcc.ts](../src/lib/mcc.ts) | `resolveMccEligibility(card, mcc, rows, channel?, chosenLabels?)` + `chosenCategoryLabels()`; whitelist/blacklist/hybrid + channel + reduced + `bonus_channel` (online-only) + `always_eligible` (any-channel) + selectable-category gating; shared by Cards, Recommend, Transactions |
| [src/components/MccInfo.tsx](../src/components/MccInfo.tsx) | ⓘ popover: ✓/◐/✗ glyph legend + "eligibility is estimated — verify with your bank" disclaimer (collapsible, no clutter) |
| [supabase/library_seed.sql](../supabase/library_seed.sql) | Full 24-card SG library seed — 19 miles cards, 4 cashback cards, 1 debit card; also sets `mcc_mode` + all `card_mcc_eligibility` rows (consolidated from migrations 044–051) so fresh installs get MCC data (run after all migrations) |
| [supabase/mcc_seed.sql](../supabase/mcc_seed.sql) | MCC catalogue (code → description → default category); includes the extra codes referenced by `card_mcc_eligibility` |
| [supabase/vendor_seed.sql](../supabase/vendor_seed.sql) | Vendor → default category/MCC (re-run after 043 for subscription/health/insurer recategorisation) |

---

## 4. Current Implementation Status

The app is a functional MVP. All core features are implemented:

| Feature | Status |
|---|---|
| Email/password + Google OAuth | Complete |
| Card library (admin-managed, 24 cards) | Complete |
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
| Admin: card export-name aliases (per card + per selectable category) applied to the Admin CSV export | Complete |
| Admin: Vendors→MCC editor (add/edit/delete vendor_catalogue) + "Copy vendor_seed SQL" sync-back | Complete |
| Vendor→MCC confidence (unverified/likely/confirmed) — editable in Admin; badge in the log form when a vendor auto-fills its MCC | Complete |
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
| One-click Cash shortcut — "Cash"/"Log Cash" opens the log form with Cash/Debit preselected (Transactions + Dashboard) | Complete |
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
| Trends charts: tooltip shows the series name (card type / category) alongside the value | Complete |
| Miles Balance page (`/miles`) — account model: opening snapshot + as-of date, expiry warnings, total across all (migrations 027–028) | Complete |
| Miles Balance: UOB-style pooling (link multiple cards to one balance), redemption/bonus ledger, reconcile | Complete |
| Miles Balance: default standalone "KrisFlyer miles" balance auto-seeded per user (localStorage-keyed) | Complete |
| Miles Balance: balance history — snapshot saved on each reconcile + manual "Snapshot"; per-account history list with change vs previous | Complete |
| Miles Earned page (`/earnings`) — per-card miles by billing cycle (calendar/statement), monthly + cumulative chart, year selector | Complete |
| Miles section: Balance / Earned tabs (MilesTabs); single "Miles" sidebar entry | Complete |
| Favourite (recurring) transactions — saved templates prefill the log form; in-app save/delete modals (migration 029) | Complete |
| Transaction form: Online Shopping category auto-sets payment channel to 'online' | Complete |
| UOB Preferred Platinum cap fix — channel-cap spend excluded from category-cap sums (no double-count) | Complete |
| PWA — installable, autoUpdate SW (cleanupOutdatedCaches/skipWaiting/clientsClaim); fixes mobile blank-screen on deploys | Complete |
| Install UX — dashboard install banner (dismissible), iOS/Android/desktop install modals | Complete |
| Mobile bottom tab bar (Home/Recommend/Log/Cards/More); desktop keeps sidebar | Complete |
| Toast notifications — app-wide save/confirm feedback (ToastContext) | Complete |
| Pull-to-refresh + mobile header refresh button (reloads cached context data) | Complete |
| Code-split routes (React.lazy + Suspense); recharts loads lazily on chart pages only | Complete |
| Readability pass — secondary text gray-400→gray-500 on light backgrounds; tiny text bumped to 11–12px | Complete |
| Empty-state CTAs (Transactions, Miles, Earnings) | Complete |
| My Cards redesign — uniform tile grid + Details modal; in-app remove confirmation | Complete |
| Cap "nearly maxed" nudge — CapUsageBar shows amber warning at 90–99% used (Dashboard) | Complete |
| Dashboard expiring-miles nudge — conditional, session-dismissible one-line chip when a miles account expires within 90 days (amber; red ≤14 days); deep-links to /miles; hidden otherwise | Complete |
| Miles goal — single cumulative target across all accounts (user_settings); progress bar with airplane marker + goal title (migrations 031–032) | Complete |
| Mile Value benchmark changed from 1.5¢ to 1.8¢ (constant, "Good" grade, note copy) | Complete |
| Expenses: Card spend definition banner (alongside the existing My spend banner) | Complete |
| Dashboard: Upcoming (future-dated) split from Recent transactions; collapsible My Wallet + Recent | Complete |
| Group split by custom divisor (÷N) + Exact $ mode | Complete |
| Partial-cap bonus/base split on Recommend + log preview (each tier floored to earn block) | Complete |
| Recurring charges (monthly) via favourites; Dashboard due→confirm; Recurring manager modal (migration 033) | Complete |
| Mile Value: Redemption / Worth-paying-more tabs; break-even ceiling + verdict; optional bonus cap | Complete |
| Styled portal DatePicker replacing native date inputs (Transactions, Cards, Miles) | Complete |
| Transaction reconciliation — per-row checkmark, filter, progress, statement-total compare (migration 034) | Complete |
| SGT timezone fix — local YYYY-MM-DD boundaries; end-of-month transactions no longer dropped from totals/caps | Complete |
| Vitest engine test suite — 18 tests over recommendations.ts (`npm test`); test files excluded from prod build | Complete |
| Error boundaries — ErrorBoundary around Layout Outlet (keyed by route) + app root; catches render crashes + lazy-chunk load failures | Complete |
| README + .env.example — onboarding docs and documented env vars | Complete |
| Recurring rules → real future transactions (every N units, end date/count); standalone create/edit editor; Transactions Upcoming section w/ range presets | Complete |
| Dashboard collapsible Upcoming (preview + View-all → Transactions) | Complete |
| Dashboard wallet card → Transactions filtered to that card (current month) | Complete |
| Transactions: From/To date-range filter; totals as stat tiles (incl. future in period) | Complete |
| Transactions: filter by bank (narrows card dropdown) + "Upcoming only" quick toggle | Complete |
| Transactions Upcoming: recurring collapsed per rule + one-offs grouped by month; mobile fixes | Complete |
| Recurring editor mirrors the log form (VendorInput/MCC/notes); rules show next charge date | Complete |
| Bonus-eligible MCC viewer (My Cards Details) + Recommend MCC hint (level 1) — Lady's Solitaire | Complete |
| MCC whitelist/blacklist model (card_library.mcc_mode; shared resolveMccEligibility helper) | Complete |
| MCC eligibility seeded — HSBC Revolution (whitelist), Citi Rewards + DBS Woman's World (blacklist) | Complete |
| MCC eligibility seeded — UOB Lady's Card + UOB KrisFlyer Visa + Maybank XL Rewards + Maybank Horizon (whitelist) | Complete |
| Channel-aware MCC eligibility (`hybrid` mode + per-row payment_channel) — UOB Preferred Platinum + UOB Visa Signature; channel toggle in Cards checker | Complete |
| Online-scoped whitelist (channel-aware whitelist rows) — SC Journey (3 mpd online only) | Complete |
| MCC eligibility seeded — Citi PremierMiles + UOB PRVI Miles trio + DBS Altitude + Amex Ascend + OCBC 90°N + HSBC TravelOne (blacklist) | Complete |
| MCC eligibility — every miles card in the library now has a model (whitelist / blacklist / hybrid / online-scoped) | Complete |
| MCC eligibility for cashback cards — SC Simply Cash blacklist (excluded MCCs earn no cashback); card-type-aware hint wording | Complete |
| Reduced-rate MCC state (`reduced` flag) — UOB Absolute Cashback categories earn 0.3% (amber "reduced rate" hint) | Complete |
| MCC eligibility — Citi Cash Back+ + MariBank blacklist; every card with an earn/no-earn distinction now modelled | Complete |
| Recommend: standalone MCC check — enter an MCC alone to see ✓/◐/✗ across all wallet cards (channel-aware) | Complete |
| Log-form recommendation widget: compact per-card MCC glyph (✓/◐/✗) when an MCC is entered | Complete |
| MccInfo (ⓘ) — collapsible legend + "estimated, do your own due diligence" disclaimer; log form + Recommend | Complete |
| UI polish — keyboard focus rings (all buttons/links); popover click-outside/Esc; sticky Transactions header; Miles nav highlights on /earnings | Complete |
| Skeleton loading states + per-page error/retry (Dashboard/Miles/Earnings/Reconcile/Points/Expenses-Trends) | Complete |
| Log-transaction form MCC eligibility hint — ✓/⚠/no-data* asterisk + footnote | Complete |
| HSBC Revolution rate boost → 8 mpd with an Everyday Global Account (effective-dated, engine-threaded) | Complete |
| Recurring editor — Cash/Debit support + fields mirror the log form (single-column, same sequence) | Complete |
| Transactions: stat-tile totals truncation fix (large 5–6 figure numbers); Upcoming mobile fixes | Complete |
| MariBank Mari Credit Card added to library (1.5% cashback) | Complete |
| New categories: Insurance / Subscription / Health; vendor recategorisation | Complete |
| EXPERIMENTAL (admin-gated) Points tab — reward-points balance per program | Experimental |
| EXPERIMENTAL (admin-gated) Reconcile tab — base/bonus credit reconciliation, cap ceilings, aggregate rounding, statement cycles | Experimental |
| EXPERIMENTAL Reconcile filters — bank; alphabetical cards; month dropdown + custom From/To date range; accept-mismatch to clear a flag | Experimental |
| EXPERIMENTAL rate boost (Lady's Savings → 6 mpd), effective-dated + engine-threaded | Experimental |

**Card library (24 cards):**

*Miles cards (19):* DBS Altitude, DBS Woman's World, UOB PRVI Miles (Visa/Amex/Mastercard), UOB Lady's Card, UOB Lady's Solitaire, UOB Visa Signature, UOB Preferred Visa, UOB KrisFlyer Visa, Standard Chartered Journey, Citi PremierMiles, Citi Rewards Mastercard, OCBC 90°N, HSBC TravelOne, HSBC Revolution, Maybank Horizon, Maybank XL Rewards, Amex KrisFlyer Ascend.

*Cashback cards (4):* Standard Chartered Simply Cash (1.5%), UOB Absolute Cashback (1.7%), Citi Cash Back+ (1.6% flat), MariBank Mari Credit Card (1.5% flat).

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
- **Admin interface for library updates** — Updating card rates/caps requires manual SQL against Supabase. There is no admin UI.
- **Annual fee-waiver tracker** — Track spend-to-waiver per card (needs new library data: fee + threshold).

### Done since last review
- **Test suite** — ✅ Vitest: `npm test` runs 18 unit tests over `recommendations.ts` (cap types, blended/partial MPD, wildcard, channel caps, min-spend, block rounding, date boundaries, ranking). Add a test alongside any new cap/rate logic.
- **`.env.example` + README** — ✅ Added; env vars documented and full setup/deploy instructions written.
- **Error boundary** — ✅ `ErrorBoundary` around the Layout Outlet (keyed by route) and app root catches render crashes and lazy-chunk load failures (no more blank screens).

### Missing but lower priority
- **Silent failures on some pages** — The self-fetching pages (Miles, Earnings, Reconcile, Points, Expenses→Trends) + Dashboard now show an inline "Couldn't load — Retry" (ErrorState) on a failed query, and skeletons while loading. Still outstanding: Cards / Recommend / Transactions read from AppContext, whose top-level load error isn't surfaced per-page yet (they'd show an empty state).
- **No pagination or date-range control on transactions** — Loads the entire current year. Will become slow with very high transaction volumes.
- **No push notifications or reminders** — Users must actively open the app; there is no proactive push. In-app nudges do exist on the Dashboard (cap "nearly maxed" via CapUsageBar; an expiring-miles chip when an account expires within 90 days), but nothing reaches the user while the app is closed.
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
- **No error boundaries** — A runtime exception in a page component will crash the entire app. With routes now code-split, a failed lazy-chunk load (flaky mobile network) is also unhandled. React's default error display shows in production.
- **Limited offline support** — A PWA service worker caches the app shell (so the installed app opens offline), but all data still comes from Supabase; the app is not usable offline beyond the shell.
- **Single Supabase project** — There is no staging environment. All development and production activity hits the same database.
- **Manual migrations** — Migrations 027–076 must be run in the Supabase SQL Editor; there is no automated migration runner. Notable: 035–041 = EXPERIMENTAL Points/Reconcile/rate-boost; 042 = recurring rules (real future transactions); 043 = new categories (then re-run `vendor_seed.sql`); 044–046/048/049/051 = MCC eligibility (per-card ranges + `mcc_mode` whitelist/blacklist); 047 = HSBC Revolution boost; 050 = MariBank card. NOTE: MCC eligibility is now consolidated into the seeds too — `library_seed.sql` sets `mcc_mode` + all `card_mcc_eligibility` rows and `mcc_seed.sql` carries the referenced MCC descriptions — so a fresh install has full MCC data from the seeds alone (the data migrations set `mcc_mode` by name and no-op if run before the cards exist).
- **Experimental Miles tabs** — The **Points** (`/points`) and **Reconcile** (`/reconcile`) tabs are admin-gated in `MilesTabs.tsx` (`user.email === ADMIN_EMAIL`) and not shown to other users. Their seeded reward-program rates and card crediting rules are indicative — verify against real statements. Drop the gate to expose.
- **Recurring generates real rows** — Recurring rules pre-create real future transactions (miles computed at generation, not recomputed later), so they count toward caps and also appear in month spend totals / future Miles Earned. Intentional (for cap planning); the estimates can drift if later spend fills a cap first.
- **Dates are local (SGT)** — All date-boundary math uses `isoDate()` (local `YYYY-MM-DD`, never `toISOString()`) and string comparisons. New date logic must follow this — mixing `new Date('YYYY-MM-DD')` (UTC) with local Date bounds previously dropped end-of-month transactions in SGT.
