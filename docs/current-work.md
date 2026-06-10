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
```

---

## Completed

Everything listed below is in a working, committed state on `main` (tagged `v3.0-expense-tracking`):

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

---

## Partially completed

### 1. Error handling outside Dashboard

Dashboard has a full error state (retry button, connection hint). Cards, Recommend, and Transactions all render an empty state silently if a Supabase query fails — there is no user-visible indication that something went wrong.

### 2. Admin tooling for library updates

The card library (rates, caps, new cards) is updated via manual SQL in the Supabase dashboard. There is no admin UI.

---

## Likely next task

The core recommendation, tracking, and expense features are now complete and accurate (tagged `v3.0-expense-tracking`). The most likely next candidates are:

1. **Unit test suite for `recommendations.ts`** — Complex branching logic (cap types, blended MPD, wildcard rates, selectable overrides, channel caps, block rounding) is entirely untested. A regression in any of these paths is invisible without tests.
2. **Error handling on Cards/Recommend/Transactions pages** — Currently shows silent empty states on Supabase failures.
3. **Pagination or date-range filter on transactions** — Currently loads the full current year; will slow down as volume grows.
4. **More cashback cards** — Citi Cash Back (the old category-based card) could be modelled if the user still holds it; other cashback products (OCBC 365, DBS Live Fresh, etc.) are not yet in the library.
