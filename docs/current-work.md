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
2026-06-08  (HEAD) Dashboard: proportional spend bars for uncapped categories
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

---

## Partially completed

### 1. Combined spending caps (known inaccuracy)

Some cards have a single shared cap across multiple categories (e.g. UOB Visa Signature: S$2,000/quarter across Dining, Groceries, and Petrol combined). The current model stores these as three independent per-category caps. The engine therefore treats each category as having its own S$2,000 limit, which overstates available headroom.

Fixing this requires:
1. A `cap_group_id` nullable UUID on `library_caps` linking rows that share a combined cap.
2. `buildPeriodSpending` to aggregate spend across grouped rows before comparing against `spend_limit`.
3. `getEffectiveForCard` to check group-level spend, not just per-category spend.
4. Library seed updated to tag the relevant rows with matching group IDs.
5. Dashboard `CapUsageBar` to render grouped caps as a single bar.

### 2. Error handling outside Dashboard

Dashboard has a full error state (retry button, connection hint). Cards, Recommend, and Transactions all render an empty state silently if a Supabase query fails — there is no user-visible indication that something went wrong.

### 3. Admin tooling for library updates

The card library (rates, caps, new cards) is updated via manual SQL in the Supabase dashboard. There is no admin UI.

---

## Likely next task

The most impactful outstanding accuracy issue is **fixing the combined spending cap model** (item 1 above). UOB Visa Signature and UOB Preferred Platinum both have combined caps currently modelled incorrectly. A user relying on the app to manage these cards will be shown incorrect remaining headroom, undermining the app's core value proposition.

The second most likely candidate is **adding a unit test suite** for `recommendations.ts`, which has complex branching logic (four cap types, blended MPD, selectable overrides) and is currently entirely untested.
