# Current Work

## Development timeline

The project started 2026-06-04; all work has landed on `main` in rapid sprints.

```
2026-06-04  Initial commit → Cloudflare Pages deploy config
2026-06-07  Onboarding, Google OAuth, UOB cards, Card Library picker
2026-06-07  Effective-date versioning for rates/caps
2026-06-07  Refactor to centralised card library model (migration 004)
2026-06-07  Dashboard fixes and polish (5 commits)
2026-06-08  Per-user selectable bonus category for Lady's Card + Solitaire
2026-06-08  Fix Dashboard: apply selectable-category overrides to cap bars
2026-06-08  Dashboard: proportional spend bars for uncapped categories
2026-06-08  Manual MPD override on transactions; transaction editing (migrations 006–007)
2026-06-08  mile_validity and remarks on card library; comprehensive card data corrections (migration 008)
2026-06-09  Add HSBC Revolution, Maybank XL Rewards, Citi Rewards Mastercard (migration 009)
2026-06-09  Combined cap modelling with cap_group (migration 010)
2026-06-09  Fix Fashion/Beauty categories (migration 011)
2026-06-09  Vendor + MCC catalogue, typeahead in transaction form (migration 012)
2026-06-09  Min-spend threshold on caps; engine locked status (migration 013)
2026-06-09  Payment channel on rates and transactions (migrations 014–015)
2026-06-09  UOB Visa Sig: contactless model, remove petrol cap (migrations 016–017)
2026-06-09  Statement cycle support — per-card statement day (migrations 018–019)
2026-06-09  earn_increment for block rounding; nominal MPD in UI (migration 020)
2026-06-10  Wildcard online rates for DBS Woman's World + Citi Rewards (migration 021)
2026-06-10  UOB Lady's Solitaire: smart effective_from default for first-time setup
2026-06-10  Transactions: sort by column, wildcard search, mobile card list
2026-06-10  Feedback system: bug/suggestion modal, admin inbox page, sidebar badge (migration 022)
2026-06-10  Remove Priority Pass remark from Amex KrisFlyer Ascend
2026-06-10  Add UOB PRVI Miles Mastercard + Amex KrisFlyer Ascend (migration 023)
2026-06-10  MCC reverse lookup: type keyword to find MCC code in transaction form
2026-06-10  Move Notes field to after Vendor in transaction form
2026-06-10  Expense tracking: card_type, cashback_rate, cashback_earned, library_cashback_rates (migration 024)
2026-06-10  Add SC Simply Cash, UOB Absolute Cashback, Citi Cash Back+ cashback cards
2026-06-10  Cash/Debit system card: always available in transaction form, hidden from library
2026-06-10  Dedicated Expenses page (spend by type, category bars, per-card breakdown)
2026-06-10  Dashboard redesign: 3-stat header (miles, cashback, total spent); Expenses page split off
2026-06-10  Mobile: fix stat card truncation (smaller text + min-w-0 truncate)
2026-06-10  Cards page: type/bank filter chips + card type badge (miles/cashback/debit)
2026-06-10  Dashboard My Wallet: filter chips by type and bank
2026-06-11  Fix Citibank bank name normalisation (Citi → Citibank for card 023)
2026-06-11  Dashboard: Cash/Debit filter chip + debit summary row in My Wallet
2026-06-11  Transactions: card filter dropdown includes Cash/Debit
2026-06-11  Replace Citi Cash Back with Citi Cash Back+ (1.6% flat, remove category overrides)
2026-06-11  Fix sidebar footer button alignment; enlarge Info icon  [tag: v3.0-expense-tracking]
2026-06-11  Fix SPA deep-link refresh: add not_found_handling to wrangler.toml
2026-06-11  Add npm run deploy script (build + wrangler deploy in one step)
2026-06-11  Make layout fully fluid — remove all max-w-* constraints; 2xl breakpoint grids on Dashboard/Cards
2026-06-11  Fix onboarding redirect on new devices — use Supabase-backed hasActivity, not localStorage only
2026-06-11  Add group-spend split: personal_amount on transactions, collapsible form section (migration 025)
2026-06-11  Add group-split info popup (ⓘ) and My spend mode banner in Expenses  [tag: v4.0-smilemax]
2026-06-12  Add Log Transaction button to Dashboard header — navigates to /transactions with auto-open modal
2026-06-12  Fix Log Transaction button on mobile — full label always visible, Refresh hidden on mobile
2026-06-12  Add CSV export to Transactions page and Excel export to Expenses page (xlsx, SheetJS)
2026-06-12  Expenses Excel: 5-sheet workbook (Definitions | Summary | By Category | By Card | Transactions)
2026-06-12  Both Card Spend and My Spend columns in every sheet — no toggle needed before exporting
2026-06-12  Personal Share column always populated (personal_amount ?? amount) in all exports
2026-06-12  Fix onboarding race condition — gate redirect on allCards.length > 0 (dataLoaded guard)
2026-06-13  Add Mile Value Calculator page (/calculator) — ticket price + miles + optional co-payment → cents per mile with colour-coded benchmark and polished 1.5¢ note
2026-06-13  Add Trends tab to Expenses — 3 grouped bar charts (spend by card type, rewards earned, top categories) with 3M/6M/12M + custom date range; own Supabase fetch independent of AppContext
2026-06-13  UOB Visa Signature: correct cap_cycle to 'statement' in library_seed.sql (migration 026 — run in Supabase)
2026-06-13  Add StatementDayPrompt — auto-popup in Layout for any statement-cycle card in wallet with no statement_day set; dismissed per-session; saves via existing saveStatementDay
2026-06-13  Fix billing cycle labels everywhere — 'statement closing day' → 'billing cycle starts on day' to match engine semantics
2026-06-13  Add cycle-end proximity warning in transaction form — amber inline alert when transaction date is within 5 days of the card's billing cycle end; uses getPeriodEnd from utils
2026-06-13  Improve Trends charts on mobile — angled X-axis labels, compact Y-axis ($1k format), 3M default, legend at top, distinct category colours (cyan replaces violet)
2026-06-20  Expenses unified date filter (Option B); year selection in custom range; Transactions year+month filter
2026-06-20  Fix Mile Value + Admin desktop width; My Cards per-bank/per-card collapse
2026-06-20  PWA install: always-show Add to Home Screen; Android + generic install modals; dashboard install banner
2026-06-20  Miles Balance page (/miles) — first cut: per-card opening balance + expiry (migration 027)
2026-06-20  Rework Miles Balance into account model — pooling, dated snapshot, redemption/bonus ledger, reconcile (migration 028)
2026-06-20  Miles Balance UX: collapsible help, bank names + colour on chips, no-expiry state, default KrisFlyer balance, total across all
2026-06-20  Miles Earned page (/earnings) — per-card earnings by billing cycle; monthly + cumulative chart; per-card chart/numbers toggle + collapse
2026-06-20  Fix UOB Preferred Platinum cap double-count (channel-cap spend excluded from category-cap sums); Online Shopping → 'online' channel default
2026-06-20  Fix mobile/PWA blank screen — cleanupOutdatedCaches + skipWaiting + clientsClaim; autoUpdate; UpdatePrompt auto-reload
2026-06-20  Favourite (recurring) transactions — saved templates prefill the log form; in-app save/delete modals (migration 029)
2026-06-21  Replace native prompt/confirm with in-app modals (Miles, Transactions); Collapse all on Miles Earned
2026-06-21  Mobile bottom tab bar + app-wide toast notifications (ToastContext)
2026-06-21  Readability pass (gray-400→gray-500 on light bg; tiny text 10→11/11→12px); empty-state CTAs
2026-06-21  Pull-to-refresh + mobile header refresh button; refresh/refreshTransactions typed Promise<void>
2026-06-21  Code-split routes (React.lazy + Suspense); merge Miles Balance + Earned into one tabbed "Miles" section
2026-06-21  My Cards: wider grid, wallet filter, full-width body, header redesign, masonry, remove confirmation  [tag: v7.0-miles-tracking]
2026-06-22  My Cards: redesign to uniform tile grid + Details modal (fixes desktop alignment)
2026-06-22  Expenses Trends: show series name (card type / category) in chart tooltips
2026-06-22  Docs refresh (project-context, current-work, decision-log) for v7.x work  [tag: v7.1-card-ui]
2026-06-22  Expenses: Card spend definition banner; Mile Value benchmark 1.5¢ → 1.8¢
2026-06-22  Cap "nearly maxed" nudge in CapUsageBar (90–99% used)
2026-06-22  Miles goal tracker — single cumulative target (user_settings, migrations 030→031); airplane progress marker + goal title (migration 032)  [tag: v7.2-miles-goal]
2026-06-23  Dashboard: separate Upcoming (future-dated) from Recent transactions
2026-06-24  Dashboard: My Wallet + Recent collapsible (persisted); group split by custom divisor (÷N)
2026-06-24  Partial-cap bonus/base split shown on Recommend cards + log preview (PartialBonusNote); each tier floored to earn block independently
2026-06-24  Recurring charges (monthly) via favourites — Dashboard "due to log" confirm flow (migration 033)
2026-06-25  Mile Value: "worth paying more?" calculator → sub-tabs → bonus cap → merge Compare + Break-even into one tab
2026-06-25  Styled portal DatePicker replaces native date inputs (Transactions, Cards, Miles)
2026-06-26  Per-transaction reconciliation against bank statements — checkmark, filter, progress, statement-total compare (migration 034)
2026-06-26  Recurring transactions manager modal (list/log-now/delete) on Transactions
2026-06-30  Fix SGT timezone bug dropping end-of-month transactions from totals, category breakdown, and cap tracking  [tag: v7.3-recurring-reconcile]
2026-07-01  Add Vitest engine test suite (18 tests over recommendations.ts); error boundaries (ErrorBoundary)  [tag: v7.4-tests-hardening]
2026-07-01  Add README and .env.example
2026-07-03  Recurring modal: let the detail line wrap instead of truncating
2026-07-03  Fix Cloudflare build — pin vitest to ^2 (vite 5) to resolve dual-esbuild lockfile drift  [tag: v7.5-build-fix]
2026-07-05  EXPERIMENTAL Points tracking (/points, admin-gated) — reward_programs + card_reward_program + points_accounts/adjustments (migration 035)
2026-07-05  EXPERIMENTAL Credit reconciliation (/reconcile, admin-gated) — base/bonus split, credit rules, credit_reconciliations (migration 036); splitBaseBonus engine helper
2026-07-05  Reconcile: base per transaction + accumulated bonus lump (migration 037); aggregate bonus rounding for UOB (migration 038)
2026-07-08  Per-user rate boost — Lady's Savings → 6 mpd (migration 039); effective-dated (migration 040); threaded through engine; boost history editor
2026-07-08  Reconcile: cap ceiling on bonus; split program bonus vs savings-boost lumps; split boost by per-transaction window
2026-07-17  Reconcile: statement-cycle bucketing + base-point totals; direct-credit cards (KrisFlyer Visa) show full miles as base (migration 041)
2026-07-17  Reconcile: card / month / status filters
2026-07-17  Recurring rework — rules generate real future transactions (every N days/weeks/months/years, end date/count); Transactions Upcoming section (migration 042)
2026-07-18  Add Insurance / Subscription / Health categories (migration 043); recategorise vendors (subscriptions, health, insurers)
2026-07-19  Upcoming range presets (default next 1 month); show full month inline when a month is filtered
2026-07-19  Dashboard: collapsible Upcoming (default expanded), next-5 preview + View-all→Transactions (opens all upcoming)  [tag: v7.6-recurring-reconcile]
2026-07-19  Recurring: standalone create/edit editor (own fields), decoupled from logging — no duplicate; "+ New" in Recurring manager
2026-07-19  Dashboard: click a wallet card → Transactions filtered to it (current month)  [tag: v7.7-recurring-ux]
2026-07-20  Recurring: show next charge date on rules; editor mirrors the log form (VendorInput autofill, MCC); notes support
2026-07-23  Transactions: optional From/To date-range filter (overrides year/month; fetched from Supabase); totals include future-dated within period
2026-07-24  Transactions: prominent totals as stat tiles (Spent/Miles/Cashback); whole-dollar values; mobile truncation fixes
2026-07-24  Transactions Upcoming: declutter — recurring collapsed to one line per rule, one-offs grouped by month, hover actions; mobile layout fixes
2026-07-27  My Cards: bonus-eligible MCC viewer (migration 044); Recommend: MCC eligibility hint (level 1) + editable MCC input
2026-07-27  MCC eligibility in log form — ✓/⚠/no-data* hint + footnote when an MCC is keyed in
2026-07-28  HSBC Revolution: flat whitelist + 16 MCC descriptions (migration 045); shared resolveMccEligibility helper (src/lib/mcc.ts)
2026-07-28  MCC whitelist/blacklist model — card_library.mcc_mode (migration 046); Revolution + Lady's Solitaire set whitelist
2026-07-28  HSBC Revolution rate boost → 8 mpd with an Everyday Global Account (migration 047; reuses effective-dated boost machinery)
2026-07-29  Citi Rewards blacklist + excluded MCC ranges (migration 048); DBS Woman's World blacklist — 44 excluded singles (migration 049)
2026-07-30  Recurring editor: add Cash/Debit; mirror the log form (single-column, same field sequence)
2026-07-30  Transactions: fix stat-tile totals truncation for large numbers; Upcoming mobile truncation fixes
2026-07-31  Add MariBank Mari Credit Card — 1.5% cashback (migration 050 + library_seed.sql)
2026-07-31  Fix vendor_seed.sql duplicate ('Foodgle') that broke ON CONFLICT DO UPDATE
2026-07-31  MCC whitelist for UOB Lady's Card (mirrors Solitaire) + UOB KrisFlyer Visa (migration 051; sourced from T&Cs)
2026-08-01  Consolidate all MCC eligibility (mcc_mode + card_mcc_eligibility) into library_seed.sql; extra MCC descriptions into mcc_seed.sql — fresh installs now get MCC data from seeds
2026-08-01  Reconcile: bank filter (v7.12)
2026-08-01  Reconcile: accept-mismatch to clear the flag (migration 052); alphabetical card filter; month dropdown + custom From/To date range
2026-08-01  Channel-aware MCC eligibility: 'hybrid' mode + card_mcc_eligibility.payment_channel (migration 053); UOB Preferred Platinum (online whitelist / contactless all / shared exclusions); channel toggle in Cards checker; channel threaded through log form + Recommend
2026-08-02  UOB Visa Signature hybrid MCC (migration 054) — same exclusions, no online whitelist (contactless-only bonus; petrol eligible); resolver + Cards handle a no-online-rows hybrid card
2026-08-02  Maybank XL Rewards whitelist MCC (migration 055) — Dine / Shop / Travel / Play; exclusions implicit (not stored — whitelist)
2026-08-02  Maybank Horizon whitelist MCC (migration 056) — Supermarkets/Dining, Transport/Petrol, Retail, Air/Hotels/Cruise; 8699 = Diamond Sky Fuel Card only; merchant-name exclusions noted as unmodellable
2026-08-02  SC Journey whitelist MCC (migration 057) — ONLINE-scoped rows (payment_channel='online'); channel-aware whitelist resolver; Cards channel toggle now shows for any channel-scoped card.
2026-08-02  Citi PremierMiles blacklist MCC (migration 058) — excluded MCCs (finance, insurance, government, quasi-cash, etc.).
2026-08-02  UOB PRVI Miles trio blacklist MCC (migration 059) — Visa/Amex/Mastercard, shared exclusion list via CROSS JOIN (card_id::uuid cast).
2026-08-02  DBS Altitude blacklist MCC (migration 060) — excluded MCCs (finance, insurance, rent, government, education, etc.).
2026-08-02  Amex KrisFlyer Ascend blacklist MCC (migration 061) — only MCC-mappable exclusions (utilities, insurance, stored value); Amex has no MCC table so merchant/txn-type exclusions (SPC, SingPost SAM, cash advance, etc.) omitted; petrol MCC not excluded (only SPC merchant).
2026-08-02  OCBC 90°N blacklist MCC (migration 062) — excluded MCCs (finance, insurance, rent, stored value, government, education, etc.).
2026-08-02  HSBC TravelOne blacklist MCC (migration 063) — excluded MCCs incl. PSP/MoneySend/online-gambling. Every miles card in the library now has an MCC eligibility model.
2026-08-02  SC Simply Cash blacklist MCC (migration 064) — first cashback card tagged; excluded MCCs earn no cashback; MCC hint wording made card-type aware (cashback vs bonus) in Cards + log form.
2026-08-02  Reduced-rate MCC state (migration 065) — `reduced` flag on card_mcc_eligibility + 'reduced' state in resolver; UOB Absolute Cashback categories (charity/education/healthcare/utilities/professional/government) earn 0.3%; amber "reduced rate" hint in Cards + log form.
```

---

## Completed

Everything listed below is in a working, committed state on `main`:

- **Auth** — Email/password and Google OAuth, per-user RLS, protected routes
- **Card library model** — Centralised read-only `card_library` with 23 SG cards, seeded via `library_seed.sql`
- **Effective-date versioning** — `library_rates` and `library_caps` carry `effective_from`; engine resolves the correct-date slice for both current and historic transactions
- **Onboarding flow** — First-run card selection grid; skip allowed; `isOnboarded` flag stored in localStorage
- **Wallet management** — Add/remove cards from `user_card_selections`; reflected immediately in all views. Debit card is hidden from the library/wallet — it is always available as a transaction option.
- **Recommendation engine** — Cap-aware MPD calculation covering monthly, quarterly, annual, and per-transaction caps; blended effective MPD for partial caps; status enum (optimal / partial / capped / base / locked). Only invoked for `card_type === 'miles'` cards.
- **Transaction logging** — Add/edit modal with vendor typeahead, MCC lookup (numeric or keyword → code), Notes field, live top-3 recommendations, payment channel selector; miles or cashback computed and stored on save; delete with confirmation
- **Transactions page** — Filterable table (month, category, card including Cash/Debit) with wildcard search across vendor/notes; sortable column headers (Date, Amount, Miles, MPD); mobile card list layout
- **Dashboard** — 3-stat header (Miles Earned, Cashback Earned, Total Spent this month), spend milestone bars, wallet section with cap progress bars + uncapped spend bars + debit row, recent transactions
- **Expenses page** — Dedicated breakdown page: spend by card type (miles / cashback / cash), total; rewards earned (miles + cashback); spend by category (horizontal bars); spend by card with inline miles/cashback earned
- **Empty-state handling** — Dashboard shows "Go to My Cards" CTA for users with no wallet cards
- **Responsive layout** — Mobile sidebar overlay and hamburger menu; stat cards truncate cleanly on narrow screens
- **Per-user selectable bonus category** — UOB Lady's Card (1 choice) and Lady's Solitaire (2 choices). First-time setup defaults `effective_from` to `2000-01-01` so the choice applies to all past transactions; subsequent changes default to today for history preservation. Engine substitutes the choice at query time — library data unchanged. Recommendations, miles calculation, and Dashboard cap bars all apply overrides correctly.
- **Dashboard spend breakdown for uncapped categories** — Cards with no cap show proportional bars per category scaled to the card's monthly total. Chosen categories on selectable cards are pinned at the top even at S$0.
- **Transaction editing** — Pencil icon per row opens the modal pre-populated; handles MPD override state.
- **Manual MPD override** — `computed_mpd`, `manual_mpd`, `override_note` stored separately. `effective_mpd = COALESCE(manual_mpd, computed_mpd)`. Amber pencil badge on overridden rows; "↺ Reset" restores to computed. (migration 006)
- **Mile validity and remarks on cards** — Displayed as chips and bullet lists in My Cards. (migration 007)
- **Comprehensive card data corrections** — All cards updated per milelion.com. (migration 008)
- **3 new miles cards (migration 009)** — HSBC Revolution, Maybank XL Rewards, Citi Rewards Mastercard.
- **Combined cap modelling** — `cap_group` on `library_caps`; engine, Dashboard, and My Cards all collapse grouped caps into one bar/chip. (migration 010)
- **Fashion (011) and Beauty (012) categories** — Added at new IDs; Lady's Card/Solitaire selectable refs fixed; Citi Rewards fashion rate corrected. (migration 011)
- **Vendor + MCC catalogue** — `vendor_catalogue` and `mcc_catalogue` admin-seeded tables. Transaction log form has a vendor typeahead that auto-fills category and MCC. MCC field also supports reverse lookup: type a keyword (e.g. "dining") to get a filtered list of matching MCC codes. (migration 012)
- **Min-spend threshold** — `min_spend` on `library_caps`. UOB Visa Sig (S$1,000/month) and Maybank XL Rewards (S$500/month) require a total card spend minimum before the bonus rate unlocks. Recommender shows "locked" status with a progress bar toward the threshold. (migration 013)
- **Payment channel on rates and transactions** — `payment_channel` on `library_rates` restricts certain bonus rates to contactless or online only. Transactions carry the channel used. Engine applies wildcard logic: a null-category rate with a matching payment channel beats any lower per-category rate. (migrations 014–015)
- **Wildcard rate pattern** — `category_id = NULL` + `payment_channel` means the card earns that bonus on ANY spending category when paid via that channel. Used for: UOB Visa Sig (4 mpd contactless), UOB Preferred Platinum Visa (4 mpd contactless), DBS Woman's World (4 mpd online), Citi Rewards (4 mpd online).
- **Channel cap pattern** — `cap_payment_channel` + `category_id = NULL` tracks all spend on that channel against one limit.
- **UOB Visa Signature contactless model** — 4 mpd on all contactless spend (any category) up to S$1,000/month. (migrations 016–017)
- **Statement cycle support** — `cap_cycle` + `statement_day` per card/user. All current cards default to calendar month. (migrations 018–019)
- **earn_increment (block rounding)** — S$5 blocks for most banks, S$1 for HSBC/Citi. Applied in engine, transaction save, MPD preview, and My Cards chip. (migration 020)
- **Nominal MPD in UI** — Transaction rows show the nominal rate (e.g. 4 mpd) with block-rounding footnote. My Cards shows the earn block size chip.
- **DBS Woman's World + Citi Rewards online wildcard** — 4 mpd on ALL online payments regardless of category. (migration 021)
- **Feedback system** — "Report a bug / Suggestion" modal in sidebar footer. Submissions stored in `feedback` table (migration 022). Admin page shows all submissions with type badges; admin can resolve/reopen each item. Open item count shown as a red badge in the sidebar nav; badge updates immediately when items are resolved or reopened (custom browser event, not Supabase realtime).
- **UOB PRVI Miles Mastercard + Amex KrisFlyer Ascend** — 2 new miles cards added to library; Ascend Priority Pass remark removed for accuracy. (migration 023)
- **Expense tracking** — `card_type ('miles' | 'cashback' | 'debit')` and `cashback_rate` on `card_library`; `cashback_earned` on `transactions`; `library_cashback_rates` table for per-category rate overrides. (migration 024)
  - Cashback computed at save: `amount × (category override rate ?? card.cashback_rate ?? 0)`.
  - Miles engine skipped entirely for cashback and debit cards.
  - Cashback cards: SC Simply Cash (1.5%), UOB Absolute Cashback (1.7%), Citi Cash Back+ (1.6% flat).
  - Debit/cash: Cash / Debit virtual card — system-level, never in wallet, always available in transaction form dropdown.
- **Cards page filters** — Type chip filter (Miles / Cashback) and bank chip filter; card type badge on each card. Debit cards hidden from library.
- **Dashboard wallet filters** — Chip filters by type (Miles / Cashback / Cash/Debit) and by bank. Cash/Debit chip appears when debit spend exists; selecting it shows the debit-only summary row.
- **Transaction form / list** — Cash/Debit always appears in card dropdown (injected from `allCards`). Card filter in transaction list includes Cash/Debit.
- **SPA routing fix** — `not_found_handling = "single-page-application"` in `wrangler.toml` so refreshing on any route (e.g. `/recommend`, `/expenses`) serves `index.html` instead of a 404. `npm run deploy` added to `package.json` to always rebuild before uploading — prevents deploying a stale `dist`.
- **Fully fluid layout** — All `max-w-*` constraints removed from Dashboard, Expenses, Cards, and Recommend. Dashboard milestones grid is `sm:grid-cols-2 2xl:grid-cols-4`; Cards library is `grid-cols-1 2xl:grid-cols-2`; Recommend uses `lg:grid-cols-[2fr_3fr]` for form/results split. Layout fills the full viewport on any monitor width.
- **Cross-device onboarding guard** — Onboarding redirect now uses a Supabase-backed `hasActivity` signal (`cards.length > 0 || transactions.length > 0`) instead of relying solely on `localStorage`. Eliminates the false onboarding prompt on new devices, phones, or after a domain change. `markOnboarded` is called proactively when `hasActivity` is true and the localStorage flag is absent.
- **Group-spend split** — Optional collapsible "÷ Split with group?" section in the transaction form. Quick-pick chips for ÷2 / ÷3 / ÷4, plus a free-entry "My share" field (accepts S$0). Stores `personal_amount` on the transaction (migration 025). Miles and cashback always earned on the full `amount`; only spend views use `personal_amount`. An ⓘ info popup next to the section header explains the feature.
- **Expenses: Card spend / My spend toggle** — Toggle appears only when the current month has at least one group spend. In "My spend" mode all spend figures use `personal_amount ?? amount`; rewards totals remain on full card amounts. An indigo banner below the stat chips explains the mode distinction. Transaction list shows an indigo "yours: S$X" label on split transactions.
- **Dashboard Total Spent sub-line** — When any transaction has a personal split, the stat sub-line shows "S$X yours · N txns" so the user can see their actual share at a glance.
- **Log Transaction button on Dashboard** — Primary "Log Transaction" button in the Dashboard header. Clicking navigates to `/transactions` with `{ state: { openModal: true } }`; Transactions reads this on mount, calls `openAdd()`, then clears the history state so back-navigation doesn't re-trigger it. Refresh button is hidden on mobile (`hidden sm:inline-flex`) to avoid header congestion; Log Transaction label is always visible.
- **CSV export on Transactions page** — "Export CSV" button exports the currently filtered view. Columns: Date, Vendor, Category (plain name, no emoji), Card, Amount, Personal Share (personal_amount ?? amount so always populated), Payment Channel, Miles Earned, MPD, Cashback Earned, Notes.
- **Excel export on Expenses page** — "Export Excel" button downloads `expenses_YYYY-MM.xlsx` via SheetJS. 5-sheet workbook: **Definitions** (term/definition table), **Summary** (totals), **By Category**, **By Card**, **Transactions**. Every breakdown sheet has both Card Spend and My Spend columns computed independently — no need to toggle the view before exporting. Personal Share column always filled (full charge when no group split). Data starts on row 1 of every sheet; all definitions live in the Definitions tab.
- **Onboarding race condition fix** — Added `dataLoaded = allCards.length > 0` guard to the redirect condition. Without this, there was a one-frame window after auth resolved where `loading = false` and `user ≠ null` but `cards = []` and `transactions = []` (data not yet fetched), causing existing users on new devices to be incorrectly sent to onboarding.
- **Mile Value Calculator** — Static `/calculator` page. Inputs: retail ticket price (S$), miles required, optional cash co-payment. Outputs cents per mile with a colour-coded grade (green/yellow/orange/red) and a progress bar with a 1.5¢ benchmark marker. Breakdown rows show price, co-payment deducted, value covered, and exact cpp.
- **Expenses: Trends tab** — Second tab alongside Overview on the Expenses page. Three grouped bar charts built with Recharts: (1) Monthly Spend by Card Type (miles/cashback/debit), (2) Rewards Earned (miles left axis, cashback right axis, dual-Y), (3) Top Categories by Month (top 5). Date range: 3M/6M/12M quick buttons or custom month-to-month picker. Data is fetched directly from Supabase (not AppContext) so cross-year ranges work.
- **UOB Visa Signature cap_cycle fix** — Corrected `cap_cycle` from `'calendar'` to `'statement'` in `library_seed.sql`. Migration 026 (`supabase/migrations/026_visa_sig_statement_cycle.sql`) updates the live database row.
- **StatementDayPrompt** — Modal auto-shown in `Layout.tsx` when the user has any `cap_cycle = 'statement'` card in their wallet with no `statement_day` set. Dismissed per-session only (not persisted). Shows one pending card at a time; saves via `saveStatementDay` from AppContext.
- **Billing cycle label fix** — All UI copy referring to "statement closing day" changed to "billing cycle starts on day" to match engine semantics (`getPeriodStart` already treats the value as the cycle start, not the closing date).
- **Cycle-end proximity warning** — Amber inline banner in the transaction form when the selected card is a miles/cashback card and the transaction date is within 5 days of the billing cycle end. Computed via `getPeriodEnd` from `utils.ts`. Warns that the posting date may fall in the next cycle.
- **Trends charts: mobile improvements** — `useIsMobile()` hook (< 640px) drives responsive chart config: X labels angled at −40°, compact Y-axis (`$1k` format), 3M default range, legend at top, narrower bar category gap. Category chart uses `['#6366f1','#10b981','#f59e0b','#ef4444','#06b6d4']` (cyan replaces violet to avoid indigo/violet confusion).
- **Trends charts: tooltip series name** — The card-type and category charts returned a single-element array from the recharts tooltip `formatter`, which dropped the series name. Returning `[value, name]` restores the "Miles: S$X" / "Dining: S$X" label.
- **Miles Balance page (`/miles`)** — Account model (migrations 027–028): a `miles_accounts` row owns a balance (opening snapshot + `as_of_date` + expiry); `miles_account_cards` links cards (a card belongs to one account → UOB-style pooling); `miles_adjustments` is a dated ledger of redemptions (negative) and bonuses (positive). **Total = opening + miles earned from transactions after the snapshot + post-snapshot adjustments** (counting only post-snapshot earned + adjustments avoids double-counting the opening balance, and makes Reconcile correct). Auto-creates a pool-of-one account per wallet miles card and a default standalone "KrisFlyer miles" balance (localStorage-keyed, exact-name match so a "UOB KrisFlyer Visa" card account doesn't suppress it). Expiry shows an amber badge within 6 months, red if expired. Reconcile folds the current total into a fresh opening as of today, keeping history. Help panel collapsed by default; a "Total miles" card sums all accounts.
- **Miles Earned page (`/earnings`)** — Per-card miles earned per billing cycle for a selected year. Calendar cards group by calendar month; statement cards group by the statement window (labelled by closing month, with the covered date range shown). Transactions fetched with a month of margin each side so cycles straddling year boundaries bucket correctly. Combined monthly + cumulative `ComposedChart` (bars left axis, line right axis), reused per card via an `EarnChart` component. Each card has a Chart/Numbers toggle (chart default) and collapse; a Collapse-all toggle sits above the list.
- **Miles section tabs** — `MilesTabs` (Balance / Earned) renders at the top of both pages; the sidebar has one "Miles" entry (down from two).
- **Favourite (recurring) transactions** — `transaction_favourites` (migration 029) stores reusable inputs only (card, category, vendor, MCC, payment channel, optional fixed amount, notes) — never computed values. Amber chips at the top of the Add modal prefill the form on today's date (miles recomputed on save); a "Save as favourite" button names and saves the current form; both save and delete use in-app modals.
- **UOB Preferred Platinum cap fix** — The card has two independent S$600 caps: a contactless **channel** cap and an Online Shopping **category** cap. `buildPeriodSpending` summed each independently, so a contactless-tagged online-shopping purchase hit both bars. Fix: a transaction whose payment channel has a dedicated channel cap on that card is excluded from that card's category/group cap sums (mirroring the engine, where a channel cap takes precedence). The transaction form also defaults the Online Shopping category to the `'online'` channel so those purchases land in the right cap.
- **PWA reliability** — `vite-plugin-pwa` switched to `registerType: 'autoUpdate'` with `cleanupOutdatedCaches` + `skipWaiting` + `clientsClaim`. This fixed a mobile/PWA blank-screen: across rapid deploys, devices were left with a stale precached `index.html` referencing purged JS chunks. `UpdatePrompt` auto-reloads once when an updated SW takes control (`isUpdate` guard avoids first-install loop). Install UX: always-visible "Add to Home Screen", iOS/Android/desktop modals, and a dismissible dashboard install banner.
- **Mobile bottom tab bar + toasts** — Layout shows a fixed bottom nav (Home/Recommend/Log/Cards/More; "More" opens the full drawer) on mobile; desktop keeps the sidebar. `ToastContext`/`useToast()` give app-wide save/confirm feedback wired into Transactions and Miles actions.
- **Pull-to-refresh** — Main scroll container supports pull-to-refresh (engages only at the top, `overscroll-contain`), plus a mobile header refresh button. Both call `refresh()`; `refresh`/`refreshTransactions` are now typed `Promise<void>` so the spinner awaits the reload.
- **Code-splitting** — All route pages are `React.lazy` with `Suspense` boundaries (Outlet in Layout + Onboarding). The ~1.2 MB single bundle dropped to ~425 KB initial; recharts (~358 KB) loads lazily only on chart pages.
- **Readability + empty states** — Secondary text darkened from `gray-400` to `gray-500` on all light backgrounds (dark sidebar grays kept); smallest text bumped (10→11px, 11→12px). Empty states on Transactions / Miles / Earnings now have action buttons.
- **My Cards redesign** — One continuous responsive grid of uniform compact tiles (sorted by bank): badge, name, one-line headline rate, key pills, and Details + Add/Remove (actions pinned to the bottom for aligned rows). Full rates/caps/remarks/statement live in a **Details modal**. Replaces the earlier per-bank masonry that produced a patchwork of half-filled, ragged sub-grids. Wallet filter ("All Cards / In Wallet"); remove-from-wallet confirmation modal.
- **Cap "nearly maxed" nudge** — `CapUsageBar` shows an amber "S$X left · nearly maxed" warning (with icon) when a cap is 90–99% used, between the normal "left" and "Cap reached" states. Self-contained, so it appears on every Dashboard cap bar.
- **Miles goal tracker** — A single cumulative target across all miles accounts, stored in a per-user `user_settings` row (`miles_goal` + `miles_goal_label`; migrations 031–032, which supersede the per-account 030). Shown in the "Total miles" card: a number input + optional title ("What for? e.g. SQ Suites to JFK"), and a progress bar with an **airplane marker** that flies along it at the current %, plus "total / goal (n%)" and "X miles to go" (emerald + "Goal reached" when hit). Save button appears when the number or title changes.
- **Mile Value benchmark 1.8¢** — Changed the value benchmark from 1.5¢ to 1.8¢ (the `BENCHMARK_CPP` constant, the "Good" grade threshold, and the benchmark note copy).
- **Expenses Card spend definition** — The explanatory banner (shown when group spends exist) now also appears in Card spend mode with a Card spend definition, not only in My spend mode.
- **Dashboard Upcoming vs Recent** — Transactions arrive newest-first, so future-dated entries crowded out recent ones in the 8-row list. Split into an "Upcoming" group (future dates, soonest first, with an "in N days" badge) above "Recent" (today or earlier). Shared row renderer; Upcoming only appears when future-dated entries exist.
- **Dashboard collapsible sections** — My Wallet and Recent Transactions collapse via a header chevron; state persisted in localStorage.
- **Group split by custom divisor** — The transaction split section adds a ÷N custom-divisor input alongside ÷2/÷3/÷4 and an "Exact $" mode, via an explicit `splitMode` ('even' | 'amount') so the divisor and dollar inputs don't collide.
- **Partial-cap bonus/base split** — When a transaction partly exceeds a cap, the spend splits across tiers: bonus rate on the cap remaining and base rate on the overflow. New `PartialBonusNote` shows both portions (within-cap / over-cap, with miles) on the Recommend cards and in the log form's Miles Rate preview. Each tier is floored to the card's earn block **independently** (e.g. $23 cap left, $200 spend, $5 block → $20 @ 4mpd + $175 @ 0.4mpd) — applied in both the engine (saved miles) and the display.
- **Recurring charges (monthly)** — Favourites extended with `recurrence`/`recur_day`/`next_due_date` (migration 033). The favourite-save modal gains a "Repeat monthly on day N" option (🔁 on recurring chips). Due → confirm model (no backend scheduler): the Dashboard lists occurrences due within 7 days; Confirm opens the log form prefilled and dated to the due date, then rolls `next_due_date` forward a month on save; Skip rolls it forward without logging. One pending per rule at a time. A "Recurring" manager modal on Transactions lists all rules with schedule/next-due/card/amount and Log-now/delete.
- **Mile Value: two-tab calculator** — Segmented sub-tabs: **Redemption value** (the original cpp tool) and **Worth paying more?** which always shows the **break-even ceiling** (max card price worth paying + premium %, from cash price + earn rate + value-per-mile + optional cap/base) and adds the specific verdict/breakdown when an optional higher card price is entered. (Built as Compare + Break-even, then merged to two tabs.)
- **Styled DatePicker** — Portal-based month-grid date picker (`DatePicker.tsx`) replaces native `<input type="date">` in Transactions, Cards, and Miles. Renders the calendar to `document.body` with computed fixed position so it's never clipped inside scrollable modals; Today/Clear shortcuts, min/max, and a `bare` variant for the inline "as of" field.
- **Transaction reconciliation** — `transactions.reconciled` (migration 034). A per-row checkmark (desktop column + mobile card) toggles reconciled (optimistic, via a local override map); an All/Unreconciled/Reconciled filter; a reconciliation bar with progress (n/total, S$ left), "Mark all visible"/Clear, and an in-session bank-statement-total input that compares to the logged total to flag a missing/extra charge.
- **SGT timezone bug fix** — Date-range math mixed UTC and local time: `new Date('YYYY-MM-DD')` is UTC midnight (08:00 SGT) while period bounds were local Date objects, and month bounds used `toISOString().slice(0,10)` (shifts ~8h back). In SGT this dropped **last-day-of-month** transactions from the Dashboard total, per-card spend/category breakdown, and cap usage — for all cards. Fix: `isoDate()` now formats the **local** date, and all period-boundary checks compare `YYYY-MM-DD` strings against `isoDate(periodStart/End)`. Applied in the engine (`buildPeriodSpending` + effective-date resolvers), Dashboard, AppContext (year start), and Miles `today()`.
- **Engine test suite (Vitest)** — `npm test` runs 18 unit tests over `recommendations.ts`: resolvers (effective-date, future-ignored, wildcard-by-channel, null-limit dropped), `buildPeriodSpending` (category sums, end-of-month SGT boundary, channel caps, channel-vs-category de-dup), `calcMiles` (no-cap, block rounding, within-cap, capped, partial-cap tier flooring, wildcard-online, channel-blocked, min-spend lock), and `recommendCards` ranking/status. `vitest.config.ts` (node env); `*.test.ts` excluded from the production `tsc` build via `tsconfig.app.json`.
- **Error boundaries** — `ErrorBoundary` (class component) catches render crashes and failed lazy-chunk loads (which otherwise blank-screen after a deploy). Wrapped around the Layout `Outlet` (keyed by `location.pathname` so navigation clears it) and at the app root. Fallback offers Try again / Reload; chunk-load errors (`Loading chunk`/`Failed to fetch`) steer to a reload.
- **README + .env.example** — Onboarding docs: features, stack, quick start, the two required `VITE_SUPABASE_*` vars, Supabase setup (manual migrations + seeds, auth, the hardcoded `ADMIN_EMAIL`), scripts, testing, structure, and Cloudflare Pages deployment.
- **Recurring modal truncation fix** — The per-row detail line (schedule · next-due · card · amount) had `truncate`, clamping it to one line and cutting off the card/amount. Removed `truncate` so it wraps; the label above keeps `truncate`.
- **Cloudflare build fix (vitest ↔ vite 5)** — vitest 4 bundled vite 6/7, adding a second esbuild (0.28.1) tree that npm 10 (Cloudflare) and npm 11 (local) deduped differently, so `npm ci` failed with "Missing: esbuild@0.28.1 from lock file". Pinned **vitest to ^2** (vite-5 compatible) → a single esbuild (0.21.5) and a version-agnostic lockfile. Verified `npm ci` succeeds and 18/18 tests still pass.

### Miles → Points & Reconcile (EXPERIMENTAL, admin-gated hidden tabs)
The Miles section (`MilesTabs`) has two extra tabs — **Points** and **Reconcile** — rendered only for `ADMIN_EMAIL` (drop the check in `MilesTabs.tsx` to expose). Migrations 035–041.
- **Reward points model** — `reward_programs` (bank currency: UNI$, DBS Points… with `miles_per_point`), `card_reward_program` (card → currency), `points_accounts` + `points_adjustments` (per-user). Seeded indicative rates + bank→program mapping (migration 035). **Points page**: per-program balance = opening + Σ(txn miles ÷ rate after snapshot) + adjustments, with a miles-equivalent grand total.
- **splitBaseBonus** (engine) — decomposes a transaction's earned miles into base (all spend × base rate, block-rounded) + bonus (the rest); base + bonus === total. Unit-tested.
- **Credit reconciliation** — per-card crediting rule on `card_library`: `base_timing`, `bonus_timing`, `bonus_by_category`, `bonus_rounding` (per_transaction | aggregate), `no_bonus_split` (migrations 036/038/041). `credit_reconciliations` (per-user, kind base|bonus|bonus_boost, cycle_month, category) + `transaction_point_recon` (per-transaction base tick; migration 037). **Reconcile page**: base reconciled per transaction; **accumulated bonus lump** per cycle (per category for split cards) with expected (points + miles), actual input, mismatch flag, reconcile tick, and a **cap ceiling** clamp. **UOB aggregate rounding**: sum eligible spend (incl. cents), floor once to the block, × per-$ rate — using rates (so sub-block charges count). **Statement-cycle bucketing** for `cap_cycle='statement'` cards via getPeriodStart/End. **Direct-credit cards** (KrisFlyer Visa, `no_bonus_split`) show full miles as base, no lumps. Card / month / status filters; base-point totals.
- **Rate boost** — a card may define an optional boost (`card_library.boost_mpd` + `boost_label`); UOB Lady's Solitaire → 6 mpd with a Lady's Savings Account (migration 039). **Effective-dated** via `user_card_boosts` (dated on/off log; migration 040) — resolved per date by `resolveBoost`, threaded through `calcMiles`/`recommendCards` (so a transaction earns the boost only if it was active on its date) and the reconcile bonus split (per-transaction window handles mid-cycle toggles). Cards → Details has the boost checkbox with an effective-from date, confirm-on-end, and an editable boost history.

### Recurring rework — real future transactions
Recurring charges are now **rules** (on `transaction_favourites`: `recur_unit`/`recur_interval`/`start_date`/`end_date`/`max_occurrences`; migration 042) that **materialise real future transactions** (`transactions.recurring_id`), so they count toward caps for planning. Repeat every N days/weeks/months/years, ending never / on a date / after N occurrences. On save (and a rolling ~12-month top-up on load) occurrences are created with miles computed per date; editing a rule regenerates future occurrences; deleting removes future ones (past kept). The **due→confirm** model and its Dashboard card were retired; the Recurring manager is now a rule editor.
- **Transactions Upcoming section** — collapsible, future-dated, with range presets (default next 1 month; 1M/3M/6M/All) + count/total. Selecting a specific month shows that whole month inline (past + future) and hides the separate Upcoming section.
- **Dashboard Upcoming** — collapsible (default expanded), next-5 preview + "View all N upcoming →" that opens Transactions with the month filter cleared, Upcoming expanded, range = All.
- **Standalone recurring editor** — creating a recurring charge is a self-contained modal (own card/category/amount/vendor/channel + schedule fields), reached via Recurring → "+ New" (or the empty-state CTA); "Create recurring" saves + generates + closes (no log modal, no duplicate). "Save as favourite" is plain one-off templates only. Editing uses the same editor.
- **Wallet card drill-down** — clicking a card's name row in the Dashboard My Wallet routes to Transactions filtered to that card (keeping the current-month filter), via nav state `filterCardId`.

### Transactions: date-range, totals, Upcoming polish
- **Date-range filter** — optional From/To pickers (open-ended allowed) that override the year/month filters when set; the window is fetched from Supabase so it can span months/years and include future-dated rows. Category/card/search/reconcile filters combine on top. (Kept year+month too, to preserve the Upcoming section the Dashboard links into.)
- **Totals as stat tiles** — Spent / Miles / Cashback (cashback tile only if any) above a "period · N transactions" caption, reflecting the active filters/range (incl. future-dated within the period). Whole-dollar values + responsive font so 5–6 figure amounts don't truncate on mobile.
- **Upcoming panel redesign (the "mix")** — recurring occurrences collapse to **one line per rule** (icon · name 🔁 · next date · ×N-in-range · amount · miles; Edit opens the rule); one-off future items **group under month subheaders**; Edit/Delete reveal on hover (desktop) / stay on mobile. Amount+miles stacked into one narrow column and meta shortened to fix mobile truncation.
- **Recurring editor mirrors the log form** — reuses the shared transaction-form state + VendorInput (autofill category + MCC), Category, MCC, Amount, Card, Payment method, Notes. Rules list shows the **next charge date**; notes flow onto occurrences and into the Upcoming rows.

### Bonus-eligible MCCs (My Cards + Recommend)
- **`card_mcc_eligibility`** (migration 044) — bonus-eligible MCC ranges per card (shared read-only reference; `mcc_start = mcc_end` for single codes). Seeded for **UOB Lady's Solitaire** from UOB's list, grouped by the card's bonus categories (incl. Travel ranges 3000–3299 / 3500–3999); adds 6 missing MCC descriptions.
- **My Cards → Details** — a "Bonus-eligible MCCs" section: an **MCC checker** (type a code → eligible/not + category) plus the eligible list grouped by category, noting unlisted MCCs earn base.
- **Recommend — MCC hint (level 1)** — the MCC field is editable (auto-filled by the vendor, or typed); each card with eligibility data shows "✓ MCC eligible · <category>" / "⚠ not in bonus list — likely base rate". Informational only (no ranking change); silent for cards without data.

### Categories & vendors
- **New categories** (migration 043 + seed): Insurance 🛡️ (013), Subscription 📺 (014), Health 🩺 (015) — base rate only.
- **Vendor recategorisation** (`vendor_seed.sql`): streaming + Investing Note → Subscription; medical + Guardian/Watsons → Health; added SG insurers (AIA, Great Eastern, Prudential, Income, Singlife, FWD, Manulife, AXA, MSIG) under Insurance.
- **vendor_seed duplicate fix** — a duplicate `'Foodgle'` row in the VALUES list made `ON CONFLICT (name) DO UPDATE` fail (`ON CONFLICT DO UPDATE command cannot affect row a second time`). Removed the duplicate so every `name` is unique.

### MCC whitelist/blacklist model
- **`card_library.mcc_mode`** (migration 046) — `'whitelist'` (only the listed MCCs earn the bonus) or `'blacklist'` (everything earns except the listed MCCs); `null` = no MCC data. `card_mcc_eligibility` rows are the list either way.
- **Shared helper `src/lib/mcc.ts`** — `resolveMccEligibility(card, mcc, rows)` → `{state: 'eligible'|'ineligible'|'nodata', label, note}`; returns `nodata` when `mcc_mode` is null; used by My Cards Details, Recommend, and the log form.
- **Seeded** — HSBC Revolution flat whitelist (migration 045, +16 MCC descriptions); Citi Rewards blacklist with excluded ranges (migration 048, +4); DBS Woman's World blacklist as 44 exact singles (migration 049, +32); UOB Lady's Solitaire whitelist (044/046); **UOB Lady's Card** whitelist mirroring Solitaire + **UOB KrisFlyer Visa** whitelist (dining/transport/online-shopping MCCs) (migration 051).
- **Deferred (couldn't source exact MCCs) — Maybank Horizon & UOB Visa Signature.** Both banks publish their lists only inside binary PDFs / images that couldn't be extracted; only Horizon's air-ticket codes (4511, 3000–3350) were in readable text. Per the "never guess" rule these were skipped rather than shipped with partial/invented codes. Revisit if a readable source (or the raw T&C text) becomes available.
- **Seed consolidation** — `mcc_mode` and all `card_mcc_eligibility` rows are now also seeded in `library_seed.sql` (mode set by card id; rows replaced per card, idempotent), and the extra MCC descriptions live in `mcc_seed.sql`. Fixes a fresh-install gap: the data migrations set `mcc_mode` by card name, so on a clean DB they ran before `library_seed` inserted the cards and no-op'd, leaving `mcc_mode` NULL (feature silently off). The seeds are now the canonical source for MCC data; the migrations remain for existing DBs.
- **Log-form MCC hint** — when an MCC is keyed into the Add/Edit transaction form, the field shows eligible/not-eligible/no-data with an asterisk and a footnote at the bottom (informational, level 1 — no ranking/miles change).

### HSBC Revolution rate boost (8 mpd)
- Like UOB Lady's Solitaire, HSBC Revolution earns a boosted rate (bonus categories → 8 mpd) when paired with an **HSBC Everyday Global Account**. Modelled by setting `boost_mpd = 8` + `boost_label` (migration 047) and reusing the existing effective-dated `user_card_boosts` machinery + `applyRateBoosts` (Revolution's bonus is category rates, so they lift 4 → 8). Toggle + history editor in Cards → Details.

### Recurring editor: Cash/Debit + mirror the log form
- The standalone recurring editor now offers **Cash/Debit** as a card option and its fields **mirror the log-transaction form** — single-column, same sequence (Name → Vendor → Notes → Category → MCC → Amount → Card Used → Payment method → Schedule), VendorInput autofill, MCC eligibility hint, 3-button payment toggle. Fixes earlier field inconsistency and truncation.

### MariBank card
- Added **MariBank Mari Credit Card** (card `…024`, Mastercard, `card_type='cashback'`, `cashback_rate=0.015`, uncapped/no-min) via migration 050 and `library_seed.sql`. Library is now **24 cards** (4 cashback). No engine change — cashback cards flow through the existing `cashback_rate` path.

---

## Partially completed

### 1. Error handling outside Dashboard

A top-level + per-route `ErrorBoundary` now catches render crashes and failed lazy-chunk loads (no more blank screens). Still outstanding: **silent Supabase query failures** on Cards/Recommend/Transactions render an empty state with no error indication — these don't throw, so the boundary doesn't catch them; they'd need per-page error state.

### 2. Admin tooling for library updates

The card library (rates, caps, new cards) is updated via manual SQL in the Supabase dashboard. There is no admin UI.

---

## Likely next task

The core recommendation, tracking, expense, trends, and utility features are now in a strong state. The most likely next candidates are:

1. **Run pending migrations in Supabase SQL Editor** (required for Miles Balance, favourites, and miles goal to work):
   - Migration 028: `028_miles_accounts.sql` (miles_accounts, miles_account_cards, miles_adjustments; supersedes 027)
   - Migration 029: `029_transaction_favourites.sql` (transaction_favourites)
   - Migration 031: `031_user_miles_goal.sql` (user_settings; supersedes 030, drops per-account goal_miles)
   - Migration 032: `032_miles_goal_label.sql` (miles_goal_label on user_settings)
   - Migration 033: `033_recurring_favourites.sql` (recurrence/recur_day/next_due_date on transaction_favourites)
   - Migration 034: `034_transaction_reconciled.sql` (reconciled on transactions)
   - Migrations 035–041 (EXPERIMENTAL Points/Reconcile/boost): `035_points_tracking`, `036_credit_reconciliation`, `037_transaction_point_recon`, `038_bonus_rounding`, `039_rate_boost`, `040_rate_boost_dated`, `041_no_bonus_split`
   - Migration 042: `042_recurring_rules.sql` (recur fields on transaction_favourites; transactions.recurring_id) — required for the new recurring model
   - Migration 043: `043_add_categories.sql` (Insurance / Subscription / Health); then re-run `vendor_seed.sql` for recategorisation
   - Migration 044: `044_card_mcc_eligibility.sql` (card_mcc_eligibility + Lady's Solitaire whitelist seed; adds 6 MCC descriptions)
   - Migrations 045–046: `045_hsbc_revolution_mcc.sql` (Revolution whitelist), `046_mcc_mode.sql` (card_library.mcc_mode whitelist/blacklist)
   - Migration 047: `047_revolution_boost.sql` (HSBC Revolution → 8 mpd with an Everyday Global Account)
   - Migrations 048–049: `048_citi_rewards_blacklist.sql`, `049_dbs_womens_blacklist.sql` (blacklist MCCs)
   - Migration 050: `050_maribank_card.sql` (MariBank Mari Credit Card — or re-run `library_seed.sql` on a fresh DB)
2. **Dashboard "expiring miles" alert** — Surface the Miles Balance 6-month expiry warning on the home screen. (The cap "almost full" nudge is now done in CapUsageBar; surfacing expiring miles on the Dashboard remains.)
3. **Annual fee-waiver tracker** — Most SG cards waive the fee at a yearly spend threshold; track spend-to-waiver per card. Needs new library data (fee + threshold per card).
4. **Per-page Supabase error states** — `ErrorBoundary` covers render/chunk crashes; Cards/Recommend/Transactions still show silent empty states on query failure.
5. **FCY / overseas logging** — Transactions are SGD-only; a foreign amount + rate would make overseas tracking and FCY-bonus accuracy better.
5. **CSV import of transactions** — Export exists; import would speed onboarding/back-fill.
6. **Pagination or date-range filter on transactions** — Currently loads the full current year; will slow down as volume grows.
