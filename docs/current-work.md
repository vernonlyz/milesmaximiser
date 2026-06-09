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
2026-06-10  Transactions: sort by column, wildcard search, mobile horizontal scroll
```

---

## Completed

Everything listed below is in a working, committed state:

- **Auth** — Email/password and Google OAuth, per-user RLS, protected routes
- **Card library model** — Centralised read-only `card_library` with 17 SG cards, seeded via `library_seed.sql`
- **Effective-date versioning** — `library_rates` and `library_caps` carry `effective_from`; engine resolves the correct-date slice for both current and historic transactions
- **Onboarding flow** — First-run card selection grid; skip allowed; `isOnboarded` flag stored in localStorage
- **Wallet management** — Add/remove cards from `user_card_selections`; reflected immediately in all views
- **Recommendation engine** — Cap-aware MPD calculation covering monthly, quarterly, annual, and per-transaction caps; blended effective MPD for partial caps; status enum (optimal / partial / capped / base / locked)
- **Transaction logging** — Add modal with vendor typeahead, live top-3 recommendations, payment channel selector; miles and effective MPD computed and stored on save; delete with confirmation
- **Transactions page** — Filterable table (month, category, card) with wildcard search across vendor/notes; sortable column headers (Date, Amount, Miles, MPD); mobile horizontal scroll
- **Dashboard** — Monthly stats, wallet card list with cap progress bars, monthly spend/miles per card, recent transactions sidebar
- **Empty-state handling** — Dashboard shows "Go to My Cards" CTA for users with no wallet cards
- **Responsive layout** — Mobile sidebar overlay and hamburger menu; all tables scroll horizontally on narrow screens
- **Per-user selectable bonus category** — UOB Lady's Card (1 choice) and Lady's Solitaire (2 choices). First-time setup defaults `effective_from` to `2000-01-01` so the choice applies to all past transactions; subsequent changes default to today for history preservation. Engine substitutes the choice at query time — library data unchanged. Recommendations, miles calculation, and Dashboard cap bars all apply overrides correctly.
- **Dashboard spend breakdown for uncapped categories** — Cards with no cap show proportional bars per category scaled to the card's monthly total. Chosen categories on selectable cards are pinned at the top even at S$0.
- **Transaction editing** — Pencil icon per row opens the modal pre-populated; handles MPD override state. Single `handleSave` branches on `editingId`.
- **Manual MPD override** — `computed_mpd`, `manual_mpd`, `override_note` stored separately. `effective_mpd = COALESCE(manual_mpd, computed_mpd)`. Amber pencil badge on overridden rows; "↺ Reset" restores to computed. (migration 006)
- **Mile validity and remarks on cards** — Displayed as chips and bullet lists in My Cards. (migration 007)
- **Comprehensive card data corrections** — All cards updated per milelion.com. (migration 008)
- **3 new cards** — HSBC Revolution, Maybank XL Rewards, Citi Rewards Mastercard. (migration 009)
- **Combined cap modelling** — `cap_group` on `library_caps`; engine, Dashboard, and My Cards all collapse grouped caps into one bar/chip. (migration 010)
- **Fashion (011) and Beauty (012) categories** — Added at new IDs; Lady's Card/Solitaire selectable refs fixed; Citi Rewards fashion rate corrected. (migration 011)
- **Vendor + MCC catalogue** — `vendor_catalogue` and `mcc_catalogue` admin-seeded tables. Transaction log form has a typeahead for vendor name that auto-fills category and MCC. MCC stored on transactions as metadata; engine continues to use `category_id`. (migration 012)
- **Min-spend threshold** — `min_spend` on `library_caps`. UOB Visa Sig (S$1,000/month) and Maybank XL Rewards (S$500/month) require a total card spend minimum before the bonus rate unlocks. Recommender shows a "locked" status with a progress bar toward the threshold. (migration 013)
- **Payment channel on rates and transactions** — `payment_channel` column on `library_rates` restricts certain bonus rates to contactless or online only. Transactions carry the channel used. Engine applies wildcard logic: a null-category rate with a matching payment channel beats any lower per-category rate. (migrations 014–015)
- **Wildcard rate pattern** — `category_id = NULL` + `payment_channel` on a `library_rates` row means the card earns that bonus on ANY spending category when paid via that channel. Used for: UOB Visa Sig (4 mpd contactless), UOB Preferred Platinum Visa (4 mpd contactless), DBS Woman's World (4 mpd online), Citi Rewards (4 mpd online).
- **Channel cap pattern** — `cap_payment_channel` + `category_id = NULL` on a `library_caps` row tracks all spend on that channel against one limit. Used alongside wildcard rates so the S$1,000/month online cap applies to any-category online spend.
- **UOB Visa Signature contactless model** — Removed petrol cap and petrol rate; card now earns 4 mpd on all contactless spend (any category) up to S$1,000/month. Cleaner and more accurate than the previous petrol+transport approximation. (migrations 016–017)
- **Statement cycle support** — `cap_cycle` (`'calendar'` | `'statement'`) on `card_library`; `statement_day` (1–28) on `user_card_selections`. Engine uses the user's statement date to determine the start of the current cap period when `cap_cycle = 'statement'`. Dashboard and My Cards show the cycle type. All current cards default to calendar month. (migrations 018–019)
- **earn_increment (block rounding)** — `earn_increment INTEGER` on `card_library` (1 for HSBC/Citi, 5 for all others). Miles = `floor(spend / increment) * increment * mpd`. Applied consistently in the engine, transaction save, manual MPD preview, and My Cards chip. (migration 020)
- **Nominal MPD in UI** — Transaction rows show the nominal rate (e.g. 4 mpd) with a footnote explaining the actual block-rounded miles earned. My Cards shows the earn block size chip.
- **DBS Woman's World + Citi Rewards online wildcard** — Both cards now earn 4 mpd on ALL online payments regardless of category (previously only "Online Shopping" category). Citi Rewards fashion cap removed from Dashboard; one Online channel cap bar shown instead. (migration 021)
- **Transaction table UX** — Notes shown as a second line under the vendor name. Sort by Date, Amount, Miles, or MPD (click header to toggle asc/desc, active column highlighted in indigo). Wildcard search across vendor name and notes. Horizontal scroll on mobile.

---

## Partially completed

### 1. Error handling outside Dashboard

Dashboard has a full error state (retry button, connection hint). Cards, Recommend, and Transactions all render an empty state silently if a Supabase query fails — there is no user-visible indication that something went wrong.

### 2. Admin tooling for library updates

The card library (rates, caps, new cards) is updated via manual SQL in the Supabase dashboard. There is no admin UI.

---

## Likely next task

The core recommendation and tracking features are now complete and accurate. The most likely next candidates are:

1. **Unit test suite for `recommendations.ts`** — Complex branching logic (cap types, blended MPD, wildcard rates, selectable overrides, channel caps, block rounding) is entirely untested. A regression in any of these paths is invisible without tests.
2. **Error handling on Cards/Recommend/Transactions pages** — Currently shows silent empty states on Supabase failures.
3. **Pagination or date-range filter on transactions** — Currently loads the full current year; will slow down as volume grows.
