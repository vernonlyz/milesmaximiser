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
2026-06-08  Manual MPD override on transactions; transaction editing; card name fix; S$1800 display fix (migrations 006–007)
2026-06-08  mile_validity and remarks on card library; comprehensive card data corrections (migration 008)
2026-06-09  Add HSBC Revolution, Maybank XL Rewards, Citi Rewards Mastercard (migration 009)
2026-06-09  Combined cap modelling with cap_group (migration 010); combined bars on Dashboard and My Cards
2026-06-09  (HEAD) Fix Fashion/Beauty categories (migration 011); remove Utilities bug from Citi Rewards
```

---

## Completed

Everything listed below is in a working, committed state:

- **Auth** — Email/password and Google OAuth, per-user RLS, protected routes
- **Card library model** — Centralised read-only `card_library` with 14 SG cards, seeded via `library_seed.sql`
- **Effective-date versioning** — `library_rates` and `library_caps` carry `effective_from`; engine resolves the current-date slice correctly
- **Onboarding flow** — First-run card selection grid; skip allowed; `isOnboarded` flag stored in localStorage
- **Wallet management** — Add/remove cards from `user_card_selections`; reflected immediately in all views
- **Recommendation engine** — Cap-aware MPD calculation covering monthly, quarterly, annual, and per-transaction caps; blended effective MPD for partial caps; status enum (optimal / partial / capped / base)
- **Transaction logging** — Add modal with live top-3 recommendations; miles and effective MPD computed and stored on save; delete with confirmation
- **Transactions page** — Filterable table (month, category, card); summary row totals
- **Dashboard** — Monthly stats, wallet card list with cap progress bars, monthly spend/miles per card, recent transactions sidebar
- **Empty-state handling** — Dashboard shows "Go to My Cards" CTA for users with no wallet cards
- **Responsive layout** — Mobile sidebar overlay and hamburger menu
- **Per-user selectable bonus category** — UOB Lady's Card (1 choice) and Lady's Solitaire (2 choices) let users set their bonus category in My Cards. Stored in `user_category_overrides` with `effective_from` for history preservation. Engine substitutes the choice into the library's bonus slot at query time — existing rate data is unchanged. Recommendations, miles calculation, and Dashboard cap bars all apply overrides correctly.
- **Dashboard spend breakdown for uncapped categories** — Cards with no cap (or spend outside capped categories) show a proportional bar per category (h-1.5, indigo-200), scaled to the card's monthly total. Chosen categories on selectable cards are pinned at the top even if S$0 spent.
- **Transaction editing** — Pencil icon per row in the transaction table opens the modal pre-populated; handles MPD override state. Single `handleSave` branches on `editingId` (null = insert, non-null = update).
- **Manual MPD override** — At transaction save time, the engine computes `computed_mpd`. Users can override with `manual_mpd` and an `override_note`. `effective_mpd = COALESCE(manual_mpd, computed_mpd)`. Both values stored; amber pencil badge shown on overridden rows. "↺ Reset" restores to computed. (migration 006)
- **Mile validity and remarks on cards** — `mile_validity TEXT` and `remarks TEXT[]` added to `card_library` (migration 007). Displayed as chips and bullet lists in My Cards.
- **Comprehensive card data corrections** — All 14 cards updated per milelion.com: Altitude base 1.3, FCY 2.2 (travel rate removed Aug 2023); OCBC 90°N base 1.3; Maybank Horizon FCY 2.8/travel 2.8; UOB Visa Sig and Preferred Plat caps now monthly; SC Journey adds transport, removes petrol; UOB KrisFlyer no FCY bonus. (migration 008)
- **3 new cards** — HSBC Revolution (4 mpd dining/shopping/transport/travel, no annual fee), Maybank XL Rewards (4 mpd dining/FCY/travel/entertainment/shopping, age 21–39), Citi Rewards Mastercard (4 mpd online shopping/fashion). (migration 009)
- **Combined cap modelling** — `cap_group TEXT` added to `library_caps` (migration 010). Caps sharing a group draw from one pool. Engine (`buildPeriodSpending`, `getEffectiveForCard`) sums across the group. Dashboard collapses to one bar labelled with icons + "Combined cap". My Cards shows one chip listing all categories. Affects SC Journey, HSBC Revolution, Maybank XL Rewards, Citi Rewards.
- **Lady's Solitaire 2 cap chips** — `Cards.tsx` now calls `applySelectableOverride` before rendering caps, producing one chip per chosen category (each at S$750/month independently).
- **Fashion (011) and Beauty (012) categories fixed** — Migration 005 silently failed to add these because IDs 009/010 were already Utilities & Bills and Others. Migration 011 adds them at new IDs 011/012, fixes Lady's Card/Solitaire selectable categories, and removes the Utilities bonus from Citi Rewards.

---

## Partially completed

### 1. UOB Visa Signature combined petrol+transport cap

UOB Visa Signature's petrol and transport categories share a combined S$1,200/month cap. Currently modelled as S$600 each (conservative approximation). A proper `cap_group` assignment (same approach used for HSBC Revolution etc.) would let users spend up to S$1,200 on either category. Deferred because the approximation is safe (never overstates headroom).

### 2. Error handling outside Dashboard

Dashboard has a full error state (retry button, connection hint). Cards, Recommend, and Transactions all render an empty state silently if a Supabase query fails — there is no user-visible indication that something went wrong.

### 3. Admin tooling for library updates

The card library (rates, caps, new cards) is updated via manual SQL in the Supabase dashboard. There is no admin UI.

---

## Likely next task

The core recommendation and tracking features are now complete and accurate. The most likely next candidates are:

1. **Unit test suite for `recommendations.ts`** — Complex branching logic (four cap types, blended MPD, selectable overrides, cap groups) is entirely untested. A regression in any of these paths is invisible without tests.
2. **UOB Visa Signature petrol+transport cap_group** — Small accuracy improvement; straightforward with the existing `cap_group` infrastructure.
3. **Error handling on Cards/Recommend/Transactions pages** — Currently shows silent empty states on Supabase failures.
